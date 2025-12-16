import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { ClientList } from "./client-list";
import Link from "next/link";

interface ClientWithBalance {
  id: number;
  legal_name: string;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  pending_shipments: number;
  balance: number;
  last_settlement_date: string | null;
  last_settlement_number: number | null;
}

async function getClientsWithBalance(): Promise<ClientWithBalance[]> {
  // Obtener clientes con cuenta corriente (incluir saldo inicial)
  const { data: entities } = await supabase
    .from('mercure_entities')
    .select('id, legal_name, tax_id, address, phone, email, payment_terms, initial_balance')
    .eq('payment_terms', 'cuenta_corriente')
    .order('legal_name');

  if (!entities || entities.length === 0) {
    return [];
  }

  // Obtener envíos rendidos por cliente (pendientes de facturar)
  const { data: shipments } = await supabase
    .from('mercure_shipments')
    .select('id, sender_id, declared_value')
    .eq('status', 'rendida');

  // Obtener última liquidación por cliente
  const { data: settlements } = await supabase
    .from('mercure_client_settlements')
    .select('entity_id, settlement_number, settlement_date')
    .order('settlement_date', { ascending: false });

  // Procesar datos
  const clientsWithBalance: ClientWithBalance[] = entities.map(entity => {
    const entityShipments = (shipments || []).filter(s => s.sender_id === entity.id);
    const pendingCount = entityShipments.length;
    
    // Saldo de remitos = suma de (flete + seguro) de cada envío
    const shipmentsBalance = entityShipments.reduce((acc, s) => {
      const value = s.declared_value || 0;
      return acc + (value * 0.05) + (value * 0.008);
    }, 0);
    
    // Saldo total = saldo inicial (histórico) + saldo de remitos nuevos
    const initialBalance = Number(entity.initial_balance) || 0;
    const balance = initialBalance + shipmentsBalance;

    const lastSettlement = (settlements || []).find(s => s.entity_id === entity.id);

    return {
      id: entity.id,
      legal_name: entity.legal_name,
      tax_id: entity.tax_id,
      address: entity.address,
      phone: entity.phone,
      email: entity.email,
      pending_shipments: pendingCount,
      balance,
      last_settlement_date: lastSettlement?.settlement_date || null,
      last_settlement_number: lastSettlement?.settlement_number || null,
    };
  });

  // Ordenar: primero los que tienen saldo (mayor a menor), luego los de saldo 0
  return clientsWithBalance.sort((a, b) => {
    if (a.balance === 0 && b.balance === 0) return a.legal_name.localeCompare(b.legal_name);
    if (a.balance === 0) return 1;
    if (b.balance === 0) return -1;
    return b.balance - a.balance;
  });
}

async function getStats() {
  const clients = await getClientsWithBalance();
  
  const withBalance = clients.filter(c => c.balance > 0);
  const totalBalance = withBalance.reduce((acc, c) => acc + c.balance, 0);
  const totalPending = clients.reduce((acc, c) => acc + c.pending_shipments, 0);
  
  return {
    totalClients: clients.length,
    clientsWithBalance: withBalance.length,
    totalBalance,
    totalPendingShipments: totalPending,
  };
}

export default async function CuentasCorrientesPage() {
  await requireAuth("/cuentas-corrientes");

  const [clients, stats] = await Promise.all([
    getClientsWithBalance(),
    getStats(),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Cuentas Corrientes</h1>
            <Link href="/cuentas-corrientes/saldos-iniciales">
              <button className="h-8 px-3 text-sm border border-neutral-200 hover:bg-neutral-50 rounded">
                Saldos Iniciales
              </button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Clientes CC</p>
              <p className="text-2xl font-semibold text-neutral-900">{stats.totalClients}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-600 uppercase tracking-wide mb-1">Con Saldo</p>
              <p className="text-2xl font-semibold text-orange-600">{stats.clientsWithBalance}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Remitos Pend.</p>
              <p className="text-2xl font-semibold text-blue-600">{stats.totalPendingShipments}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Saldo Total</p>
              <p className="text-lg font-semibold text-green-600">
                ${new Intl.NumberFormat('es-AR').format(stats.totalBalance)}
              </p>
            </div>
          </div>

          {/* Lista de clientes */}
          <ClientList initialClients={clients} />
        </div>
      </main>
    </div>
  );
}

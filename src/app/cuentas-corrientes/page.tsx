import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
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
  // Obtener envíos pendientes de cobro (entregados pero no pagados)
  // Status: delivered, en_destino, arrived = ya llegaron/entregaron, pendiente de cobro
  // IMPORTANTE: El cliente es el DESTINATARIO (recipient_id), no el remitente
  const { data: shipments, error: shipmentsError } = await supabaseAdmin!
    .schema('mercure').from('shipments')
    .select('id, recipient_id, quotation_id, status, declared_value, weight_kg, pickup_fee')
    .in('status', ['delivered', 'en_destino', 'arrived', 'rendida', 'entregado']);

  if (shipmentsError) {
    console.error('[CC] Error fetching shipments:', shipmentsError);
  }

  // Obtener IDs únicos de DESTINATARIOS con envíos pendientes (el cliente es quien recibe y paga)
  const recipientIdsWithShipments = [...new Set((shipments || []).map(s => s.recipient_id).filter(Boolean))];
  
  // Obtener TODOS los clientes que tienen envíos pendientes O tienen payment_terms = cuenta_corriente
  const { data: entities } = await supabaseAdmin!
    .schema('mercure').from('entities')
    .select('id, legal_name, tax_id, address, phone, email, payment_terms, initial_balance')
    .or(`payment_terms.eq.cuenta_corriente,id.in.(${recipientIdsWithShipments.join(',') || '0'})`)
    .order('legal_name');

  if (!entities || entities.length === 0) {
    return [];
  }

  console.log('[CC Debug] Shipments:', shipments?.length || 0, '| Entities found:', entities.length);

  // Obtener IDs de cotizaciones únicas
  const quotationIds = [...new Set((shipments || []).map(s => s.quotation_id).filter(Boolean))];
  
  // Obtener precios de cotizaciones
  let quotationsMap: Record<string, number> = {};
  if (quotationIds.length > 0) {
    const { data: quotations } = await supabaseAdmin!
      .schema('mercure').from('quotations')
      .select('id, total_price')
      .in('id', quotationIds);
    
    if (quotations) {
      quotationsMap = Object.fromEntries(quotations.map(q => [q.id, q.total_price || 0]));
    }
  }

  // Obtener última liquidación por cliente
  const { data: settlements } = await supabaseAdmin!
    .schema('mercure').from('client_settlements')
    .select('entity_id, settlement_number, settlement_date')
    .order('settlement_date', { ascending: false });

  // Procesar datos
  const clientsWithBalance: ClientWithBalance[] = entities.map(entity => {
    // El cliente es el DESTINATARIO (recipient_id)
    const entityShipments = (shipments || []).filter(s => s.recipient_id === entity.id);
    const pendingCount = entityShipments.length;
    
    // Saldo de remitos = suma de precios de cotización o fallback
    const shipmentsBalance = entityShipments.reduce((acc, s) => {
      // Prioridad: 1. Cotización (ya incluye pickup_fee), 2. Cálculo básico por peso + pickup_fee
      let price = 0;
      const pickupFee = Number(s.pickup_fee) || 0;
      
      if (s.quotation_id && quotationsMap[s.quotation_id]) {
        // La cotización ya tiene el total con pickup_fee incluido
        price = quotationsMap[s.quotation_id];
      } else if (s.weight_kg && s.weight_kg > 0) {
        // Fallback: cálculo básico (tarifa promedio $500/kg + seguro 0.8% + pickup_fee)
        const baseFlete = Math.max(s.weight_kg * 500, 5000); // Mínimo $5000
        const insuranceCost = (s.declared_value || 0) * 0.008;
        price = baseFlete + insuranceCost + pickupFee;
      } else if (s.declared_value && s.declared_value > 0) {
        // Fallback 2: solo seguro si hay valor declarado + pickup_fee
        price = s.declared_value * 0.05 + pickupFee; // 5% aproximado
      } else if (pickupFee > 0) {
        // Fallback 3: solo pickup_fee si existe
        price = pickupFee;
      }
      
      return acc + price;
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
          <div className="flex flex-wrap gap-6 mb-4 py-2 text-sm">
            <div>
              <span className="text-neutral-500">Clientes CC:</span>
              <span className="ml-2 font-medium text-neutral-900">{stats.totalClients}</span>
            </div>
            <div>
              <span className="text-neutral-500">Con saldo:</span>
              <span className="ml-2 font-medium text-neutral-900">{stats.clientsWithBalance}</span>
            </div>
            <div>
              <span className="text-neutral-500">Remitos pend.:</span>
              <span className="ml-2 font-medium text-neutral-900">{stats.totalPendingShipments}</span>
            </div>
            <div>
              <span className="text-neutral-500">Saldo total:</span>
              <span className="ml-2 font-medium text-neutral-900">
                ${new Intl.NumberFormat('es-AR').format(stats.totalBalance)}
              </span>
            </div>
          </div>

          {/* Lista de clientes */}
          <ClientList initialClients={clients} />
        </div>
      </main>
    </div>
  );
}

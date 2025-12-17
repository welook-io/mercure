"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { Loader2, Save, ArrowLeft, DollarSign, Search } from "lucide-react";
import Link from "next/link";

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
  initial_balance: number | null;
  initial_balance_date: string | null;
  payment_terms: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function SaldosInicialesPage() {
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [changes, setChanges] = useState<Record<number, { balance: string; date: string }>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadEntities();
  }, []);

  async function loadEntities() {
    const { data } = await supabase
      .schema('mercure').from('entities')
      .select('id, legal_name, tax_id, initial_balance, initial_balance_date, payment_terms')
      .order('legal_name');
    
    setEntities(data || []);
    setLoading(false);
  }

  const handleBalanceChange = (entityId: number, value: string) => {
    setChanges(prev => ({
      ...prev,
      [entityId]: {
        ...prev[entityId],
        balance: value,
        date: prev[entityId]?.date || new Date().toISOString().split('T')[0],
      }
    }));
  };

  const handleDateChange = (entityId: number, value: string) => {
    setChanges(prev => ({
      ...prev,
      [entityId]: {
        ...prev[entityId],
        balance: prev[entityId]?.balance || '0',
        date: value,
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const updates = Object.entries(changes).map(([id, data]) => ({
        id: parseInt(id),
        initial_balance: parseFloat(data.balance) || 0,
        initial_balance_date: data.date || null,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .schema('mercure').from('entities')
          .update({
            initial_balance: update.initial_balance,
            initial_balance_date: update.initial_balance_date,
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: `${updates.length} saldos actualizados correctamente` });
      setChanges({});
      loadEntities();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar los cambios' });
    } finally {
      setSaving(false);
    }
  };

  const filteredEntities = entities.filter(e => 
    e.legal_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.tax_id && e.tax_id.includes(search))
  );

  const changesCount = Object.keys(changes).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pt-12 flex items-center justify-center h-[80vh]">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <Link href="/cuentas-corrientes">
                <button className="h-8 w-8 flex items-center justify-center hover:bg-neutral-100 rounded">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <div>
                <h1 className="text-lg font-medium text-neutral-900">Saldos Iniciales</h1>
                <p className="text-xs text-neutral-500">Cargar saldos históricos para migración</p>
              </div>
            </div>
            
            {changesCount > 0 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-300 text-white rounded flex items-center gap-2 text-sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar {changesCount} cambio{changesCount > 1 ? 's' : ''}
              </button>
            )}
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Búsqueda */}
          <div className="mb-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o CUIT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
            />
          </div>

          {/* Tabla */}
          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">CUIT</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cta. Cte.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Saldo Inicial</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha Corte</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-neutral-400">
                        No se encontraron clientes
                      </td>
                    </tr>
                  ) : (
                    filteredEntities.map((entity) => {
                      const currentBalance = changes[entity.id]?.balance ?? (entity.initial_balance?.toString() || '');
                      const currentDate = changes[entity.id]?.date ?? (entity.initial_balance_date || '');
                      const hasChange = changes[entity.id] !== undefined;
                      
                      return (
                        <tr 
                          key={entity.id} 
                          className={`border-b border-neutral-100 last:border-0 ${hasChange ? 'bg-orange-50' : 'hover:bg-neutral-50'}`}
                        >
                          <td className="px-3 py-2 font-medium">{entity.legal_name}</td>
                          <td className="px-3 py-2 text-neutral-600 font-mono text-xs">{entity.tax_id || '-'}</td>
                          <td className="px-3 py-2">
                            {entity.payment_terms === 'cuenta_corriente' ? (
                              <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 rounded">Sí</span>
                            ) : (
                              <span className="text-xs text-neutral-400">No</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="relative w-32">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                              <input
                                type="number"
                                value={currentBalance}
                                onChange={(e) => handleBalanceChange(entity.id, e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                className="w-full h-8 pl-6 pr-2 border border-neutral-200 rounded text-sm focus:border-orange-400 focus:ring-0 text-right"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={currentDate}
                              onChange={(e) => handleDateChange(entity.id, e.target.value)}
                              className="h-8 px-2 border border-neutral-200 rounded text-sm focus:border-orange-400 focus:ring-0"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 text-xs text-neutral-500">
            <p><strong>Nota:</strong> El saldo inicial es la deuda histórica del cliente al momento de migrar al sistema.</p>
            <p>Este saldo se suma automáticamente a los remitos nuevos para calcular el saldo total en Cuentas Corrientes.</p>
          </div>
        </div>
      </main>
    </div>
  );
}


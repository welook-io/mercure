import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FileText, Plus, TrendingUp, Clock, CheckCircle } from "lucide-react";

const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  generada: 'Generada',
  enviada: 'Enviada',
  conformada: 'Conformada',
  disputada: 'Disputada',
  facturada: 'Facturada',
  pagada: 'Pagada',
  anulada: 'Anulada',
};

async function getSettlements() {
  const { data } = await supabase
    .from('mercure_client_settlements')
    .select(`*, entity:mercure_entities(id, legal_name, tax_id)`)
    .order('settlement_date', { ascending: false })
    .limit(50);
  return data || [];
}

async function getStats() {
  const { data: settlements } = await supabase
    .from('mercure_client_settlements')
    .select('status, total_amount');
  
  if (!settlements) return { total: 0, generadas: 0, conformadas: 0, pendientes: 0, montoTotal: 0 };
  
  return {
    total: settlements.length,
    generadas: settlements.filter(s => s.status === 'generada').length,
    conformadas: settlements.filter(s => s.status === 'conformada').length,
    pendientes: settlements.filter(s => ['generada', 'enviada'].includes(s.status)).length,
    montoTotal: settlements.reduce((acc, s) => acc + (parseFloat(s.total_amount) || 0), 0),
  };
}

function getStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case 'conformada': case 'pagada': return 'success';
    case 'generada': case 'enviada': return 'warning';
    case 'disputada': return 'error';
    case 'facturada': return 'info';
    default: return 'default';
  }
}

function formatCurrency(value: number | string | null): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || isNaN(num as number)) return '-';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(num as number);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default async function LiquidacionesPage() {
  await requireAuth("/liquidaciones");

  const [settlements, stats] = await Promise.all([getSettlements(), getStats()]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Liquidaciones</h1>
            <Link 
              href="/liquidaciones/nueva"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-neutral-500" />
                <span className="text-xs text-neutral-500 uppercase tracking-wide">Total</span>
              </div>
              <p className="text-2xl font-semibold text-neutral-900">{stats.total}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-orange-600 uppercase tracking-wide">Pendientes</span>
              </div>
              <p className="text-2xl font-semibold text-orange-600">{stats.pendientes}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600 uppercase tracking-wide">Conformadas</span>
              </div>
              <p className="text-2xl font-semibold text-green-600">{stats.conformadas}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-600 uppercase tracking-wide">Monto Total</span>
              </div>
              <p className="text-lg font-semibold text-blue-600 truncate">{formatCurrency(stats.montoTotal)}</p>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Nro.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Fecha</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase tracking-wide">Total</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">CAE</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-12 text-center">
                        <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                        <p className="text-neutral-500">No hay liquidaciones</p>
                      </td>
                    </tr>
                  ) : (
                    settlements.map((settlement: Record<string, unknown>) => {
                      const entity = settlement.entity as { legal_name: string; tax_id: string } | null;
                      return (
                        <tr key={settlement.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                          <td className="px-3 py-2">
                            <span className="font-mono font-medium text-neutral-900">#{String(settlement.settlement_number)}</span>
                          </td>
                          <td className="px-3 py-2 font-medium text-neutral-900">{entity?.legal_name || '-'}</td>
                          <td className="px-3 py-2 text-neutral-600 text-xs">{formatDate(settlement.settlement_date as string)}</td>
                          <td className="px-3 py-2 text-right font-mono font-medium text-neutral-900">
                            {formatCurrency(settlement.total_amount as number)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={getStatusVariant(settlement.status as string)}>
                              {SETTLEMENT_STATUS_LABELS[settlement.status as string] || String(settlement.status)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            {settlement.cae ? (
                              <span className="font-mono text-xs text-green-600">{String(settlement.cae)}</span>
                            ) : (
                              <span className="text-neutral-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/liquidaciones/${settlement.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Ver
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

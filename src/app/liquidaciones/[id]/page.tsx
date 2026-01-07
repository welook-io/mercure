import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, Printer } from "lucide-react";
import Image from "next/image";
import { SettlementActions } from "./settlement-actions";

const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  generada: 'Generada',
  enviada: 'Enviada',
  conformada: 'Conformada',
  disputada: 'Disputada',
  facturada: 'Facturada',
  pagada: 'Pagada',
  anulada: 'Anulada',
};

async function getSettlement(id: string) {
  const { data } = await supabaseAdmin!
    .schema('mercure').from('client_settlements')
    .select(`*, entity:entities(id, legal_name, tax_id, address, phone, email)`)
    .eq('id', id)
    .single();
  return data;
}

async function getSettlementItems(settlementId: string) {
  const { data } = await supabaseAdmin!
    .schema('mercure').from('settlement_items')
    .select('*')
    .eq('settlement_id', settlementId)
    .order('sort_order', { ascending: true });
  return data || [];
}

function formatCurrency(value: number | string | null): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || isNaN(num as number)) return '0.00';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num as number);
}

function formatDate(date: string | null, includeTime = false): string {
  if (!date) return '-';
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (includeTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
  return new Date(date).toLocaleDateString('es-AR', options);
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'conformada': case 'pagada': return 'bg-green-100 text-green-800 border-green-300';
    case 'generada': case 'enviada': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'disputada': return 'bg-red-100 text-red-800 border-red-300';
    case 'facturada': return 'bg-blue-100 text-blue-800 border-blue-300';
    default: return 'bg-neutral-100 text-neutral-600 border-neutral-300';
  }
}

export default async function LiquidacionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth("/liquidaciones");
  
  const { id } = await params;
  const [settlement, items] = await Promise.all([getSettlement(id), getSettlementItems(id)]);

  if (!settlement) notFound();

  const entity = settlement.entity as { legal_name: string; tax_id: string; address: string | null } | null;

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      {/* Toolbar */}
      <div className="bg-zinc-900 text-white px-4 py-3 print:hidden sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/liquidaciones" className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />Volver
            </Link>
            <div className="h-4 w-px bg-neutral-700" />
            <span className="text-sm font-medium">Liquidación #{settlement.settlement_number}</span>
          </div>
          <SettlementActions settlementId={settlement.id} hasCae={!!settlement.cae} />
        </div>
      </div>

      {/* Documento */}
      <div className="max-w-5xl mx-auto p-4 print:p-0 print:max-w-none">
        <div className="bg-white rounded-lg shadow-sm print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Image src="/mercure_logos/logo_remito.png" alt="Mercure SRL" width={140} height={60} className="object-contain" />
                <div className="text-xs text-neutral-500">
                  <p className="font-medium text-neutral-700">MERCURE SRL</p>
                  <p>Logística a Medida</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-lg font-semibold text-neutral-900 mb-1">Planilla de liquidación</h1>
                <div className="inline-flex items-center gap-2 bg-neutral-100 rounded px-3 py-1.5">
                  <span className="text-sm text-neutral-500">Nro:</span>
                  <span className="text-xl font-bold text-neutral-900">{settlement.settlement_number}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Metadatos */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-neutral-200 border-b border-neutral-200">
            <div className="bg-white p-3">
              <p className="text-xs text-neutral-500 mb-0.5">Prestador</p>
              <p className="text-sm font-medium text-neutral-900">MERCURE SRL</p>
            </div>
            <div className="bg-white p-3">
              <p className="text-xs text-neutral-500 mb-0.5">Cliente</p>
              <p className="text-sm font-medium text-neutral-900">{entity?.legal_name || '-'}</p>
            </div>
            <div className="bg-white p-3">
              <p className="text-xs text-neutral-500 mb-0.5">Generada el</p>
              <p className="text-sm font-medium text-neutral-900">{formatDate(settlement.settlement_date, true)}</p>
            </div>
            <div className="bg-white p-3">
              <p className="text-xs text-neutral-500 mb-0.5">Estado</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(settlement.status)}`}>
                {settlement.status === 'conformada' && <Check className="w-3 h-3" />}
                {settlement.status === 'anulada' && <X className="w-3 h-3" />}
                {SETTLEMENT_STATUS_LABELS[settlement.status] || settlement.status}
              </span>
            </div>
            <div className="bg-white p-3">
              <p className="text-xs text-neutral-500 mb-0.5">CUIT</p>
              <p className="text-sm font-mono text-neutral-900">{entity?.tax_id || '-'}</p>
            </div>
            <div className="bg-white p-3">
              <p className="text-xs text-neutral-500 mb-0.5">Factura</p>
              <p className="text-sm font-mono text-neutral-900">{settlement.invoice_number || '-'}</p>
            </div>
            <div className="bg-white p-3 lg:col-span-2">
              <p className="text-xs text-neutral-500 mb-0.5">CAE</p>
              <p className="text-sm font-mono text-green-600">{settlement.cae || '-'}</p>
            </div>
          </div>

          {/* Tabla de operaciones */}
          <div className="p-4">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Operaciones Rendidas</h2>
            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Comprobante</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Emisión</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Ruta</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-neutral-400">Sin operaciones</td></tr>
                  ) : (
                    items.map((item: Record<string, unknown>) => (
                      <tr key={item.id as number} className="border-b border-neutral-100 last:border-0">
                        <td className="px-3 py-2 font-mono text-neutral-900">{String(item.delivery_note_number)}</td>
                        <td className="px-3 py-2 text-neutral-600 text-xs">{formatDate(item.emission_date as string, true)}</td>
                        <td className="px-3 py-2 text-neutral-900">{String(item.recipient_name || '-')}</td>
                        <td className="px-3 py-2 text-neutral-600">{String(item.origin)} - {String(item.destination)}</td>
                        <td className="px-3 py-2 text-right font-mono font-medium text-neutral-900">${formatCurrency(item.total_amount as number)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr className="bg-neutral-50 border-t border-neutral-200">
                      <td colSpan={4} className="px-3 py-2 text-right font-medium text-neutral-900">Total</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-neutral-900">${formatCurrency(settlement.total_amount)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Resumen */}
          <div className="p-4 pt-2">
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Subtotal Flete</p>
                  <p className="text-sm font-mono font-medium text-neutral-900">${formatCurrency(settlement.subtotal_flete)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Subtotal Seguro</p>
                  <p className="text-sm font-mono font-medium text-neutral-900">${formatCurrency(settlement.subtotal_seguro)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Subtotal Entrega</p>
                  <p className="text-sm font-mono font-medium text-neutral-900">${formatCurrency(settlement.subtotal_entrega)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">IVA</p>
                  <p className="text-sm font-mono font-medium text-neutral-900">${formatCurrency(settlement.subtotal_iva)}</p>
                </div>
                <div className="lg:border-l lg:border-neutral-200 lg:pl-4">
                  <p className="text-xs text-neutral-500 mb-0.5">Total</p>
                  <p className="text-xl font-mono font-bold text-neutral-900">${formatCurrency(settlement.total_amount)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-neutral-200 text-center">
            <p className="text-xs text-neutral-400">Documento generado por Mercure</p>
          </div>
        </div>
      </div>
    </div>
  );
}












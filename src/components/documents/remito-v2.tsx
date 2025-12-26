"use client";

import Image from "next/image";

interface QuotationData {
  base_price: number;
  insurance_cost: number;
  pickup_fee: number;
  total_price: number;
  includes_iva: boolean;
}

interface ShipmentData {
  id: number;
  delivery_note_number: string;
  status: string;
  created_at: string;
  sender?: {
    legal_name: string;
    tax_id?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  recipient?: {
    legal_name: string;
    tax_id?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  recipient_address?: string | null;
  package_quantity: number;
  weight_kg: number;
  volume_m3?: number | null;
  declared_value: number;
  load_description?: string | null;
  paid_by?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  quotation?: QuotationData | null;
}

interface RemitoDocumentProps {
  shipment: ShipmentData;
}

const MERCURE = {
  cuit: "30-71625497-2",
  address: "MZA 14 LT 11 BO San Martín",
  city: "Palpalá, Jujuy",
  phone: "011-2452-0473",
  email: "consultasmercure@gmail.com",
  web: "mercuresrl.com",
  iibb: "A-1-63484",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function RemitoDocumentV2({ shipment }: RemitoDocumentProps) {
  const guideNumber = `R0005-${String(shipment.id).padStart(8, '0')}`;
  const dateStr = formatDate(shipment.created_at);
  const isCtaCte = shipment.payment_terms === 'cuenta_corriente';

  // Costos - Si no hay cotización, mostrar "Pendiente de cotizar"
  // NUNCA usar fórmulas hardcodeadas - el precio real viene de la cotización
  // Nota: Los campos numeric de Supabase pueden llegar como strings, hay que parsearlos
  const rawQuotation = shipment.quotation;
  const quotation: QuotationData = rawQuotation ? {
    base_price: Number(rawQuotation.base_price) || 0,
    insurance_cost: Number(rawQuotation.insurance_cost) || 0,
    pickup_fee: Number(rawQuotation.pickup_fee) || 0,
    total_price: Number(rawQuotation.total_price) || 0,
    includes_iva: rawQuotation.includes_iva || false,
  } : {
    base_price: 0,
    insurance_cost: 0,
    pickup_fee: 0,
    total_price: 0,
    includes_iva: false,
  };
  
  const hasQuotation = !!rawQuotation && quotation.total_price > 0;

  const subtotal = quotation.base_price + quotation.insurance_cost + quotation.pickup_fee;
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  return (
    <div className="p-8 font-sans text-neutral-800 print:p-6 bg-white min-h-full">
      
      {/* ══════════════════════════════════════════════════════════════
          HEADER - Diseño moderno con accent bar
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Image 
            src="/mercure_logos/logo_remito.png" 
            alt="Mercure" 
            width={180} 
            height={50}
            style={{ height: '48px', width: 'auto' }}
          />
          <div className="mt-3 text-[11px] text-neutral-500 leading-relaxed">
            <p>{MERCURE.address}, {MERCURE.city}</p>
            <p>{MERCURE.phone} · {MERCURE.email}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="inline-block">
            <div className="bg-neutral-900 text-white px-4 py-2 text-center mb-2">
              <p className="text-[10px] uppercase tracking-widest opacity-70">Remito</p>
              <p className="text-lg font-bold font-mono tracking-wider">{guideNumber}</p>
            </div>
            <div className="text-[11px] text-neutral-600 space-y-0.5">
              <p><span className="text-neutral-400">Fecha:</span> {dateStr}</p>
              <p><span className="text-neutral-400">CUIT:</span> {MERCURE.cuit}</p>
              <p><span className="text-neutral-400">IIBB:</span> {MERCURE.iibb}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Línea divisoria con accent */}
      <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 mb-6"></div>

      {/* ══════════════════════════════════════════════════════════════
          INFO PRINCIPAL - Cards modernas
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Remitente */}
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <div className="bg-neutral-100 px-3 py-2 border-b border-neutral-200">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Remitente</p>
          </div>
          <div className="p-3">
            <p className="font-bold text-base mb-2">{shipment.sender?.legal_name || '-'}</p>
            <div className="space-y-1 text-[11px]">
              <p><span className="text-neutral-400 w-16 inline-block">Dirección</span> {shipment.sender?.address || '-'}</p>
              <p><span className="text-neutral-400 w-16 inline-block">Tel</span> {shipment.sender?.phone || '-'}</p>
              <p><span className="text-neutral-400 w-16 inline-block">CUIT</span> <span className="font-mono">{shipment.sender?.tax_id || '-'}</span></p>
            </div>
          </div>
        </div>

        {/* Destinatario */}
        <div className="border-2 border-orange-200 rounded-lg overflow-hidden bg-orange-50/30">
          <div className="bg-orange-100 px-3 py-2 border-b border-orange-200 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-700">Destinatario</p>
            {isCtaCte && (
              <span className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">CTA CTE</span>
            )}
          </div>
          <div className="p-3">
            <p className="font-bold text-base mb-2">{shipment.recipient?.legal_name || '-'}</p>
            <div className="space-y-1 text-[11px]">
              <p><span className="text-neutral-400 w-16 inline-block">Dirección</span> {shipment.recipient_address || '-'}</p>
              <p><span className="text-neutral-400 w-16 inline-block">Tel</span> {shipment.recipient?.phone || '-'}</p>
              <p><span className="text-neutral-400 w-16 inline-block">CUIT</span> <span className="font-mono">{shipment.recipient?.tax_id || '-'}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MÉTRICAS - Diseño dashboard
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex gap-2 mb-6">
        <div className="bg-neutral-900 text-white rounded-lg p-3 text-center w-16 shrink-0">
          <p className="text-[9px] uppercase tracking-wider opacity-60 mb-1">Bultos</p>
          <p className="text-2xl font-black">{shipment.package_quantity}</p>
        </div>
        <div className="bg-neutral-100 rounded-lg p-3 text-center flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-neutral-500 mb-1">Peso</p>
          <p className="text-lg font-bold font-mono">{formatNumber(Number(shipment.weight_kg))}</p>
          <p className="text-[9px] text-neutral-400">kg</p>
        </div>
        <div className="bg-neutral-100 rounded-lg p-3 text-center flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-neutral-500 mb-1">Volumen</p>
          <p className="text-lg font-bold font-mono">{shipment.volume_m3 ? formatNumber(Number(shipment.volume_m3), 2) : '-'}</p>
          <p className="text-[9px] text-neutral-400">m³</p>
        </div>
        <div className="border-2 border-neutral-900 rounded-lg p-3 text-center flex-[1.8] min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-neutral-500 mb-1">Valor Decl.</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(shipment.declared_value)}</p>
          <p className="text-[9px] text-neutral-400">ARS</p>
        </div>
        <div className="bg-neutral-900 text-white rounded-lg p-3 text-center w-24 shrink-0">
          <p className="text-[9px] uppercase tracking-wider opacity-60 mb-1">Pago</p>
          <p className="text-sm font-black uppercase">{shipment.paid_by || 'Destino'}</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DETALLE DEL FLETE - Layout horizontal
      ══════════════════════════════════════════════════════════════ */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden mb-6">
        <div className="grid grid-cols-3 divide-x divide-neutral-200">
          {/* Costos */}
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Detalle Flete</p>
            {hasQuotation ? (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Flete</span>
                  <span className="font-mono">{formatCurrency(quotation.base_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Seguro</span>
                  <span className="font-mono">{formatCurrency(quotation.insurance_cost)}</span>
                </div>
                {quotation.pickup_fee > 0 && (
                  <div className="flex justify-between">
                    <span>Retiro</span>
                    <span className="font-mono">{formatCurrency(quotation.pickup_fee)}</span>
                  </div>
                )}
                <div className="border-t border-neutral-100 pt-1.5 mt-1.5">
                  <div className="flex justify-between text-neutral-500 text-[10px]">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500 text-[10px]">
                    <span>IVA 21%</span>
                    <span className="font-mono">{formatCurrency(iva)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-neutral-200">
                  <span>TOTAL</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-center h-12 text-neutral-400 italic">
                  Cotización pendiente
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-neutral-200">
                  <span>TOTAL</span>
                  <span className="font-mono text-neutral-400">A cotizar</span>
                </div>
              </div>
            )}
          </div>

          {/* Contenido */}
          <div className="col-span-2 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">Contenido Declarado</p>
            <div className="flex gap-4 mb-2 text-[11px]">
              <div>
                <span className="text-neutral-400">Pieza:</span> <span className="font-medium">Bulto General</span>
              </div>
              <div>
                <span className="text-neutral-400">Remito:</span> <span className="font-mono">{shipment.delivery_note_number || '-'}</span>
              </div>
            </div>
            <p className="text-[10px] text-neutral-600 leading-relaxed bg-neutral-50 p-2 rounded">
              {shipment.load_description 
                ? (shipment.load_description.length > 200 
                    ? shipment.load_description.substring(0, 200) + '...' 
                    : shipment.load_description)
                : 'Mercadería según remito del cliente.'}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          OBSERVACIONES
      ══════════════════════════════════════════════════════════════ */}
      {shipment.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">Observaciones</p>
          <p className="text-[11px] text-amber-900">{shipment.notes}</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          FIRMA + INFO LEGAL
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="border border-neutral-200 rounded-lg p-3">
          <div className="border-b border-dashed border-neutral-300 h-14 mb-2"></div>
          <p className="text-[9px] text-neutral-400 text-center uppercase">Firma</p>
        </div>
        <div className="border border-neutral-200 rounded-lg p-3">
          <div className="border-b border-dashed border-neutral-300 h-14 mb-2"></div>
          <p className="text-[9px] text-neutral-400 text-center uppercase">Aclaración y DNI</p>
        </div>
        <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
          <p className="text-[10px] text-neutral-400 mb-1">C.A.E.</p>
          <p className="font-mono text-sm mb-2">________________</p>
          <p className="text-[10px] text-neutral-400">Vto: ___/___/____</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-[9px] text-neutral-400 leading-relaxed max-w-xl mx-auto">
          Términos y condiciones comunicados según ley 26361. Este documento no es válido como factura.
        </p>
        <p className="text-[10px] text-neutral-500 mt-2 font-medium">{MERCURE.web}</p>
      </div>
    </div>
  );
}


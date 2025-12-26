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

interface RemitoDuplexProps {
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

// Componente individual del remito (compacto para landscape)
function RemitoHalf({ shipment, type }: { shipment: ShipmentData; type: 'ORIGINAL' | 'DUPLICADO' }) {
  const guideNumber = `R0005-${String(shipment.id).padStart(8, '0')}`;
  const dateStr = formatDate(shipment.created_at);
  const isCtaCte = shipment.payment_terms === 'cuenta_corriente';

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
    <div className="p-4 font-sans text-neutral-800 bg-white h-full flex flex-col text-[9px]">
      
      {/* HEADER */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Image 
            src="/mercure_logos/logo_remito.png" 
            alt="Mercure" 
            width={120} 
            height={35}
            style={{ height: '32px', width: 'auto' }}
          />
          <div className="mt-1.5 text-[8px] text-neutral-500 leading-tight">
            <p>{MERCURE.address}, {MERCURE.city}</p>
            <p>{MERCURE.phone} · {MERCURE.email}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="inline-block">
            <div className="bg-neutral-900 text-white px-2.5 py-1.5 text-center mb-1.5">
              <p className="text-[7px] uppercase tracking-widest opacity-70">Remito</p>
              <p className="text-xs font-bold font-mono tracking-wide">{guideNumber}</p>
            </div>
            <div className="text-[8px] text-neutral-600 space-y-0.5">
              <p><span className="text-neutral-400">Fecha:</span> {dateStr}</p>
              <p><span className="text-neutral-400">CUIT:</span> {MERCURE.cuit}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Badge tipo documento */}
      <div className="flex justify-center mb-2">
        <span className={`text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm ${
          type === 'ORIGINAL' 
            ? 'bg-neutral-900 text-white' 
            : 'border-2 border-neutral-900 text-neutral-900'
        }`}>
          {type}
        </span>
      </div>

      {/* Línea accent */}
      <div className="h-0.5 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 mb-3"></div>

      {/* REMITENTE / DESTINATARIO */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Remitente */}
        <div className="border border-neutral-200 rounded overflow-hidden">
          <div className="bg-neutral-100 px-2 py-1 border-b border-neutral-200">
            <p className="text-[7px] font-semibold uppercase tracking-wider text-neutral-500">Remitente</p>
          </div>
          <div className="p-2">
            <p className="font-bold text-[10px] mb-1 truncate">{shipment.sender?.legal_name || '-'}</p>
            <div className="space-y-0.5 text-[8px]">
              <p className="truncate"><span className="text-neutral-400">Dir:</span> {shipment.sender?.address || '-'}</p>
              <p><span className="text-neutral-400">Tel:</span> {shipment.sender?.phone || '-'}</p>
              <p><span className="text-neutral-400">CUIT:</span> <span className="font-mono">{shipment.sender?.tax_id || '-'}</span></p>
            </div>
          </div>
        </div>

        {/* Destinatario */}
        <div className="border-2 border-orange-200 rounded overflow-hidden bg-orange-50/30">
          <div className="bg-orange-100 px-2 py-1 border-b border-orange-200 flex items-center justify-between">
            <p className="text-[7px] font-semibold uppercase tracking-wider text-orange-700">Destinatario</p>
            {isCtaCte && (
              <span className="text-[6px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">CTA CTE</span>
            )}
          </div>
          <div className="p-2">
            <p className="font-bold text-[10px] mb-1 truncate">{shipment.recipient?.legal_name || '-'}</p>
            <div className="space-y-0.5 text-[8px]">
              <p className="truncate"><span className="text-neutral-400">Dir:</span> {shipment.recipient_address || '-'}</p>
              <p><span className="text-neutral-400">Tel:</span> {shipment.recipient?.phone || '-'}</p>
              <p><span className="text-neutral-400">CUIT:</span> <span className="font-mono">{shipment.recipient?.tax_id || '-'}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="flex gap-1.5 mb-3">
        <div className="bg-neutral-900 text-white rounded p-2 text-center flex-1">
          <p className="text-[6px] uppercase tracking-wider opacity-60">Bultos</p>
          <p className="text-lg font-black leading-tight">{shipment.package_quantity}</p>
        </div>
        <div className="bg-neutral-100 rounded p-2 text-center flex-1">
          <p className="text-[6px] uppercase tracking-wider text-neutral-500">Peso</p>
          <p className="text-sm font-bold font-mono">{formatNumber(Number(shipment.weight_kg))}</p>
          <p className="text-[6px] text-neutral-400">kg</p>
        </div>
        <div className="bg-neutral-100 rounded p-2 text-center flex-1">
          <p className="text-[6px] uppercase tracking-wider text-neutral-500">Vol</p>
          <p className="text-sm font-bold font-mono">{shipment.volume_m3 ? formatNumber(Number(shipment.volume_m3), 1) : '-'}</p>
          <p className="text-[6px] text-neutral-400">m³</p>
        </div>
        <div className="border border-neutral-900 rounded p-2 text-center flex-[1.5]">
          <p className="text-[6px] uppercase tracking-wider text-neutral-500">Valor Decl.</p>
          <p className="text-xs font-bold font-mono">{formatCurrency(shipment.declared_value)}</p>
        </div>
        <div className="bg-neutral-900 text-white rounded p-2 text-center flex-1">
          <p className="text-[6px] uppercase tracking-wider opacity-60">Pago</p>
          <p className="text-[9px] font-black uppercase leading-tight">{shipment.paid_by || 'Destino'}</p>
        </div>
      </div>

      {/* DETALLE */}
      <div className="border border-neutral-200 rounded overflow-hidden mb-3 flex-1">
        <div className="grid grid-cols-5 divide-x divide-neutral-200 h-full">
          {/* Costos */}
          <div className="col-span-2 p-2">
            <p className="text-[7px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">Detalle Flete</p>
            {hasQuotation ? (
              <div className="space-y-1 text-[8px]">
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
                <div className="border-t border-neutral-100 pt-1 mt-1">
                  <div className="flex justify-between text-neutral-500 text-[7px]">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500 text-[7px]">
                    <span>IVA 21%</span>
                    <span className="font-mono">{formatCurrency(iva)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-[10px] pt-1 border-t border-neutral-200">
                  <span>TOTAL</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-[8px]">
                <div className="flex items-center justify-center h-8 text-neutral-400 italic text-[7px]">
                  Cotización pendiente
                </div>
                <div className="flex justify-between font-bold text-[10px] pt-1 border-t border-neutral-200">
                  <span>TOTAL</span>
                  <span className="font-mono text-neutral-400">A cotizar</span>
                </div>
              </div>
            )}
          </div>

          {/* Contenido */}
          <div className="col-span-3 p-2">
            <p className="text-[7px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">Contenido Declarado</p>
            <div className="flex gap-3 mb-1.5 text-[8px]">
              <div>
                <span className="text-neutral-400">Pieza:</span> <span className="font-medium">Bulto</span>
              </div>
              <div>
                <span className="text-neutral-400">Rem:</span> <span className="font-mono">{shipment.delivery_note_number || '-'}</span>
              </div>
            </div>
            <p className="text-[7px] text-neutral-600 leading-snug bg-neutral-50 p-1.5 rounded">
              {shipment.load_description 
                ? (shipment.load_description.length > 120 
                    ? shipment.load_description.substring(0, 120) + '...' 
                    : shipment.load_description)
                : 'Mercadería según remito del cliente.'}
            </p>
          </div>
        </div>
      </div>

      {/* OBSERVACIONES */}
      {shipment.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-2">
          <p className="text-[7px] font-semibold uppercase tracking-wider text-amber-700 mb-0.5">Observaciones</p>
          <p className="text-[8px] text-amber-900 leading-snug truncate">{shipment.notes}</p>
        </div>
      )}

      {/* FIRMA */}
      <div className="grid grid-cols-3 gap-2 mt-auto">
        <div className="border border-neutral-200 rounded p-2">
          <div className="border-b border-dashed border-neutral-300 h-8 mb-1"></div>
          <p className="text-[6px] text-neutral-400 text-center uppercase">Firma</p>
        </div>
        <div className="border border-neutral-200 rounded p-2">
          <div className="border-b border-dashed border-neutral-300 h-8 mb-1"></div>
          <p className="text-[6px] text-neutral-400 text-center uppercase">Aclaración y DNI</p>
        </div>
        <div className="border border-neutral-200 rounded p-2 bg-neutral-50">
          <p className="text-[7px] text-neutral-400">C.A.E.</p>
          <p className="font-mono text-[8px]">________________</p>
          <p className="text-[6px] text-neutral-400 mt-0.5">Vto: ___/___/____</p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[6px] text-neutral-400 text-center mt-2">
        T&C según ley 26361 · No válido como factura · {MERCURE.web}
      </p>
    </div>
  );
}

// Componente Duplex - Dos remitos lado a lado con línea de corte
export function RemitoDuplex({ shipment }: RemitoDuplexProps) {
  return (
    <div className="flex h-full bg-white">
      {/* Original (izquierda) */}
      <div className="flex-1 h-full min-w-0">
        <RemitoHalf shipment={shipment} type="ORIGINAL" />
      </div>
      
      {/* Línea de corte con tijerita */}
      <div className="relative flex flex-col items-center justify-center px-1" style={{ width: '20px' }}>
        {/* Línea punteada vertical */}
        <div 
          className="absolute inset-y-4 left-1/2 -translate-x-1/2 w-0"
          style={{ 
            borderLeft: '2px dashed #d4d4d4',
          }}
        ></div>
        
        {/* Tijerita en el centro */}
        <div className="relative z-10 bg-white py-2 flex flex-col items-center gap-1">
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-neutral-400 transform rotate-90"
          >
            <circle cx="6" cy="6" r="3"></circle>
            <circle cx="6" cy="18" r="3"></circle>
            <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
            <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
            <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
          </svg>
          <span className="text-[6px] text-neutral-400 font-medium tracking-tight" style={{ writingMode: 'vertical-lr' }}>CORTAR</span>
        </div>
      </div>
      
      {/* Duplicado (derecha) */}
      <div className="flex-1 h-full min-w-0">
        <RemitoHalf shipment={shipment} type="DUPLICADO" />
      </div>
    </div>
  );
}


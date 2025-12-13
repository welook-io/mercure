"use client";

import Image from "next/image";

interface QuotationData {
  base_price: number;
  insurance_cost: number;
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
  address: "MZA 14 LT 11 BO San Martín, Palpalá, Jujuy",
  phone: "011-2452-0473",
  email: "consultasmercure@gmail.com",
  web: "mercuresrl.com",
  iibb: "A-1-63484",
  inicio: "10/2018",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
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

export function RemitoDocument({ shipment }: RemitoDocumentProps) {
  const guideNumber = `R0005-${String(shipment.id).padStart(8, '0')}`;
  const dateStr = formatDate(shipment.created_at);
  const timeStr = formatTime(shipment.created_at);
  const isCtaCte = shipment.payment_terms === 'cuenta_corriente';

  // Costos - Si no hay cotización, mostrar "Pendiente de cotizar"
  // NUNCA usar fórmulas hardcodeadas - el precio real viene de la cotización
  // Nota: Los campos numeric de Supabase pueden llegar como strings, hay que parsearlos
  const rawQuotation = shipment.quotation;
  const quotation: QuotationData = rawQuotation ? {
    base_price: Number(rawQuotation.base_price) || 0,
    insurance_cost: Number(rawQuotation.insurance_cost) || 0,
    total_price: Number(rawQuotation.total_price) || 0,
    includes_iva: rawQuotation.includes_iva || false,
  } : {
    base_price: 0,
    insurance_cost: 0,
    total_price: 0,
    includes_iva: false,
  };
  
  const hasQuotation = !!rawQuotation && quotation.total_price > 0;

  const subtotal = quotation.base_price + quotation.insurance_cost;
  const iva = quotation.includes_iva ? 0 : subtotal * 0.21;
  const total = subtotal + iva;

  return (
    <div className="p-6 font-sans text-neutral-900 print:p-5 text-[12px] leading-snug">
      
      {/* HEADER */}
      <div className="grid grid-cols-12 gap-0 border-2 border-neutral-900">
        
        {/* Logo + Datos Empresa */}
        <div className="col-span-4 p-3 border-r border-neutral-300">
          <Image 
            src="/mercure_logos/logo_remito.png" 
            alt="Mercure" 
            width={150} 
            height={45}
            className="mb-2"
            style={{ height: '42px', width: 'auto' }}
          />
          <div className="space-y-0.5 text-[10px] text-neutral-600 leading-tight">
            <p>{MERCURE.address}</p>
            <p>Tel: {MERCURE.phone}</p>
            <p>{MERCURE.email}</p>
            <p>{MERCURE.web} · IVA Resp. Inscripto</p>
          </div>
        </div>

        {/* Código R - Centro */}
        <div className="col-span-2 flex flex-col items-center justify-center border-r border-neutral-300 bg-neutral-50 py-3">
          <div className="border-2 border-neutral-900 w-16 h-16 flex items-center justify-center bg-white">
            <span className="text-4xl font-black">R</span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1">Cód. 91</span>
        </div>

        {/* Datos Remito */}
        <div className="col-span-6 p-3">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-xl font-black tracking-tight">REMITO</h1>
            <span className="text-[10px] border border-neutral-900 px-2 py-0.5 font-medium">ORIGINAL</span>
          </div>
          <div className="space-y-0.5 text-[11px]">
            <p>
              <span className="text-neutral-500">GUÍA</span>{" "}
              <span className="font-mono font-bold">{guideNumber}</span>
            </p>
            <p>
              <span className="text-neutral-500">FECHA</span> {dateStr}{" "}
              <span className="text-neutral-500 ml-2">HORA</span> {timeStr}
            </p>
            <p>
              <span className="text-neutral-500">CUIT</span> {MERCURE.cuit}{" "}
              <span className="text-neutral-500 ml-2">IIBB</span> {MERCURE.iibb}
            </p>
          </div>
        </div>
      </div>

      {/* SERVICIO + CONDICIONES */}
      <div className="grid grid-cols-4 gap-0 border-x-2 border-b border-neutral-900">
        <div className="border-r border-neutral-300 p-2">
          <p className="text-[9px] text-neutral-400 uppercase">Servicio</p>
          <p className="font-medium">Flete de carga</p>
        </div>
        <div className="border-r border-neutral-300 p-2">
          <p className="text-[9px] text-neutral-400 uppercase">Cond. Venta</p>
          <p className={`font-medium ${isCtaCte ? 'text-orange-600' : ''}`}>
            {isCtaCte ? 'Cuenta Corriente' : 'Contado'}
          </p>
        </div>
        <div className="border-r border-neutral-300 p-2">
          <p className="text-[9px] text-neutral-400 uppercase">Origen</p>
          <p className="font-medium">DEP. BUENOS AIRES</p>
        </div>
        <div className="p-2">
          <p className="text-[9px] text-neutral-400 uppercase">Destino</p>
          <p className="font-medium">SALTA / JUJUY</p>
        </div>
      </div>

      {/* REMITENTE / DESTINATARIO */}
      <div className="grid grid-cols-2 gap-0 border-x-2 border-b border-neutral-900">
        {/* Remitente */}
        <div className="border-r border-neutral-300">
          <div className="bg-neutral-100 px-2 py-1.5 border-b border-neutral-300">
            <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-600">Remitente</p>
          </div>
          <div className="p-2">
            <p className="font-bold text-sm mb-2">{shipment.sender?.legal_name || '-'}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <div>
                <p className="text-[9px] text-neutral-400 uppercase">Domicilio</p>
                <p>{shipment.sender?.address || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase">Teléfono</p>
                <p className="font-mono text-[10px]">{shipment.sender?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase">CUIT</p>
                <p className="font-mono text-[10px]">{shipment.sender?.tax_id || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase">Cond. Fiscal</p>
                <p>Resp. Inscripto</p>
              </div>
            </div>
          </div>
        </div>

        {/* Destinatario */}
        <div>
          <div className="bg-orange-50 px-2 py-1.5 border-b border-neutral-300 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-wide text-orange-700">Destinatario</p>
            {isCtaCte && (
              <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-medium">CTA. CTE.</span>
            )}
          </div>
          <div className="p-2">
            <p className="font-bold text-sm mb-2">{shipment.recipient?.legal_name || '-'}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <div>
                <p className="text-[9px] text-neutral-400 uppercase">Domicilio</p>
                <p>{shipment.recipient_address || shipment.recipient?.address || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase">Teléfono</p>
                <p className="font-mono text-[10px]">{shipment.recipient?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase">CUIT</p>
                <p className="font-mono text-[10px]">{shipment.recipient?.tax_id || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase">Localidad</p>
                <p>S.S. de Jujuy</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETALLE ENVÍO */}
      <div className="grid grid-cols-5 gap-0 border-x-2 border-b-2 border-neutral-900">
        <div className="border-r border-neutral-300 py-3 px-2 bg-neutral-50 text-center">
          <p className="text-[9px] text-neutral-500 uppercase mb-1">Bultos</p>
          <p className="text-2xl font-black">{shipment.package_quantity}</p>
        </div>
        <div className="border-r border-neutral-300 py-3 px-2 text-center">
          <p className="text-[9px] text-neutral-500 uppercase mb-1">Peso (kg)</p>
          <p className="text-base font-bold font-mono">{formatNumber(Number(shipment.weight_kg))}</p>
        </div>
        <div className="border-r border-neutral-300 py-3 px-2 text-center">
          <p className="text-[9px] text-neutral-500 uppercase mb-1">Volumen (m³)</p>
          <p className="text-base font-bold font-mono">{shipment.volume_m3 ? formatNumber(Number(shipment.volume_m3), 4) : '-'}</p>
        </div>
        <div className="border-r border-neutral-300 py-3 px-2 text-center">
          <p className="text-[9px] text-neutral-500 uppercase mb-1">Valor Declarado</p>
          <p className="text-sm font-bold font-mono">{formatCurrency(shipment.declared_value)}</p>
        </div>
        <div className="py-3 px-2 text-center">
          <p className="text-[9px] text-neutral-500 uppercase mb-1">Pago Flete</p>
          <p className="text-base font-bold uppercase">{shipment.paid_by || 'Destino'}</p>
        </div>
      </div>

      {/* SERVICIOS + CONTENIDO */}
      <div className="grid grid-cols-5 gap-0 border-x-2 border-b border-neutral-900">
        {/* Servicios */}
        <div className="col-span-2 border-r border-neutral-300">
          <div className="bg-neutral-100 px-2 py-1.5 border-b border-neutral-300">
            <p className="text-[9px] font-bold uppercase tracking-wide">Servicios</p>
          </div>
          {hasQuotation ? (
            <div className="p-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>1. Flete</span>
                <span className="font-mono font-medium">{formatCurrency(quotation.base_price)}</span>
              </div>
              <div className="flex justify-between">
                <span>2. Seguro</span>
                <span className="font-mono font-medium">{formatCurrency(quotation.insurance_cost)}</span>
              </div>
              <div className="border-t border-neutral-200 pt-1.5 mt-1.5 space-y-0.5">
                <div className="flex justify-between text-neutral-500 text-[10px]">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-500 text-[10px]">
                  <span>IVA 21%</span>
                  <span className="font-mono">{formatCurrency(iva)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-neutral-200">
                  <span>TOTAL</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2 text-[11px]">
              <div className="flex items-center justify-center h-16 text-neutral-400 italic">
                Cotización pendiente
              </div>
              <div className="border-t border-neutral-200 pt-1.5 mt-1.5">
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL</span>
                  <span className="font-mono text-neutral-400">A cotizar</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="col-span-3">
          <div className="bg-neutral-100 px-2 py-1.5 border-b border-neutral-300">
            <p className="text-[9px] font-bold uppercase tracking-wide">Declaración Jurada - Contenido</p>
          </div>
          <div className="p-2 text-[11px]">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <p className="text-[9px] text-neutral-400 uppercase">Pieza</p>
                <p className="font-medium">Bulto General</p>
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase">Remito Cliente</p>
                <p className="font-mono text-[10px]">{shipment.delivery_note_number || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] text-neutral-400 uppercase mb-0.5">Detalle</p>
              <p className="text-[10px] text-neutral-700 leading-snug">
                {shipment.load_description 
                  ? (shipment.load_description.length > 280 
                      ? shipment.load_description.substring(0, 280) + '...' 
                      : shipment.load_description)
                  : 'Mercadería según remito del cliente. NO INFORMA.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* OBSERVACIONES */}
      {shipment.notes && (
        <div className="border-x-2 border-b border-neutral-900 p-2">
          <p className="text-[9px] text-neutral-400 uppercase mb-0.5">Observaciones</p>
          <p className="text-[10px] leading-snug">{shipment.notes}</p>
        </div>
      )}
      
      {/* TÉRMINOS */}
      <div className="border-x-2 border-b border-neutral-900 px-2 py-1.5 bg-neutral-50">
        <p className="text-[9px] text-neutral-400 leading-snug">
          En este acto se hace saber que los Términos y Condiciones del envío han sido comunicadas, notificadas y leídas al cliente, dando estricto cumplimiento a la normativa de la ley 26361.
        </p>
      </div>

      {/* FIRMA + CAE */}
      <div className="grid grid-cols-3 gap-0 border-x-2 border-b-2 border-neutral-900">
        <div className="border-r border-neutral-300 p-3">
          <div className="border-b border-neutral-400 h-12 mb-1"></div>
          <p className="text-[9px] text-neutral-400 uppercase text-center">Firma</p>
        </div>
        <div className="border-r border-neutral-300 p-3">
          <div className="border-b border-neutral-400 h-12 mb-1"></div>
          <p className="text-[9px] text-neutral-400 uppercase text-center">Aclaración y DNI</p>
        </div>
        <div className="p-3 bg-neutral-50">
          <div className="text-[10px] space-y-0.5">
            <p><span className="text-neutral-400">C.A.E.:</span> <span className="font-mono">________________</span></p>
            <p><span className="text-neutral-400">Vto:</span> <span className="font-mono">___/___/______</span></p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[9px] text-neutral-400 mt-2">
        Este documento no es válido como factura · {MERCURE.web}
      </p>
    </div>
  );
}

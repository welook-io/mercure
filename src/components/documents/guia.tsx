"use client";

import Image from "next/image";

interface RemitoResumen {
  id: number;
  delivery_note_number: string;
  sender_name: string;
  recipient_name: string;
  recipient_address: string;
  package_quantity: number;
  weight_kg: number;
  declared_value: number;
  paid_by?: string;
}

interface GuiaData {
  id: number;
  guia_number: string;
  trip_date: string;
  origin: string;
  destination: string;
  vehicle?: {
    plate: string;
    description?: string;
  } | null;
  driver?: {
    name: string;
    dni?: string;
    phone?: string;
  } | null;
  remitos: RemitoResumen[];
  notes?: string | null;
}

interface GuiaDocumentProps {
  guia: GuiaData;
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function GuiaDocument({ guia }: GuiaDocumentProps) {
  const guiaNumber = guia.guia_number || `G0001-${String(guia.id).padStart(8, '0')}`;
  const dateStr = formatDate(guia.trip_date);

  // Totales
  const totalBultos = guia.remitos.reduce((sum, r) => sum + r.package_quantity, 0);
  const totalPeso = guia.remitos.reduce((sum, r) => sum + r.weight_kg, 0);
  const totalValor = guia.remitos.reduce((sum, r) => sum + r.declared_value, 0);

  return (
    <div className="p-8 font-sans text-neutral-800 print:p-6 bg-white min-h-full">
      
      {/* ══════════════════════════════════════════════════════════════
          HEADER - Compacto
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Image 
            src="/mercure_logos/logo_remito.png" 
            alt="Mercure" 
            width={160} 
            height={44}
            style={{ height: '38px', width: 'auto' }}
          />
          <div className="mt-1.5 text-[9px] text-neutral-500 leading-relaxed">
            <p>{MERCURE.address}, {MERCURE.city} · {MERCURE.phone}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="inline-block">
            <div className="bg-neutral-900 text-white px-3 py-1.5 text-center mb-1.5">
              <p className="text-[8px] uppercase tracking-widest opacity-70">Hoja de Ruta</p>
              <p className="text-base font-bold font-mono tracking-wider">{guiaNumber}</p>
            </div>
            <div className="text-[9px] text-neutral-600">
              <span className="text-neutral-400">Fecha:</span> {dateStr} · <span className="text-neutral-400">CUIT:</span> {MERCURE.cuit}
            </div>
          </div>
        </div>
      </div>

      {/* Línea divisoria con accent */}
      <div className="h-0.5 bg-gradient-to-r from-neutral-800 via-neutral-600 to-neutral-400 mb-4"></div>

      {/* ══════════════════════════════════════════════════════════════
          RUTA + VEHÍCULO + CONDUCTOR - Compacto en una fila
      ══════════════════════════════════════════════════════════════ */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-neutral-900 text-white px-3 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider">Datos del Viaje</p>
        </div>
        <div className="grid grid-cols-12 divide-x divide-neutral-200">
          {/* Ruta */}
          <div className="col-span-6 p-2.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[8px] uppercase tracking-wider text-neutral-400">Origen</p>
                <p className="font-bold text-sm truncate">{guia.origin}</p>
              </div>
              <svg className="w-4 h-4 text-neutral-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[8px] uppercase tracking-wider text-neutral-400">Destino</p>
                <p className="font-bold text-sm truncate">{guia.destination}</p>
              </div>
            </div>
          </div>

          {/* Vehículo */}
          <div className="col-span-3 p-2.5">
            <p className="text-[8px] uppercase tracking-wider text-neutral-400">Vehículo</p>
            <p className="font-bold text-sm font-mono">{guia.vehicle?.plate || '-'}</p>
            {guia.vehicle?.description && (
              <p className="text-[9px] text-neutral-500 truncate">{guia.vehicle.description}</p>
            )}
          </div>

          {/* Conductor */}
          <div className="col-span-3 p-2.5">
            <p className="text-[8px] uppercase tracking-wider text-neutral-400">Conductor</p>
            <p className="font-bold text-sm truncate">{guia.driver?.name || '-'}</p>
            <p className="text-[9px] text-neutral-500">
              {guia.driver?.dni && `DNI: ${guia.driver.dni}`}
              {guia.driver?.dni && guia.driver?.phone && ' · '}
              {guia.driver?.phone && `Tel: ${guia.driver.phone}`}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MÉTRICAS TOTALES - Compacto
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex gap-2 mb-4">
        <div className="bg-neutral-900 text-white rounded-lg p-3 text-center w-16 shrink-0">
          <p className="text-[9px] uppercase tracking-wider opacity-60 mb-1">Remitos</p>
          <p className="text-2xl font-black">{guia.remitos.length}</p>
        </div>
        <div className="bg-neutral-100 rounded-lg p-3 text-center flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-neutral-500 mb-1">Bultos</p>
          <p className="text-lg font-bold">{totalBultos}</p>
        </div>
        <div className="bg-neutral-100 rounded-lg p-3 text-center flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-neutral-500 mb-1">Peso</p>
          <p className="text-lg font-bold font-mono">{formatNumber(totalPeso)}</p>
          <p className="text-[9px] text-neutral-400">kg</p>
        </div>
        <div className="border-2 border-neutral-900 rounded-lg p-3 text-center flex-[2] min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-neutral-500 mb-1">Valor Decl.</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(totalValor)}</p>
          <p className="text-[9px] text-neutral-400">ARS</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TABLA DE REMITOS - Principal con alto fijo
      ══════════════════════════════════════════════════════════════ */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden mb-4" style={{ minHeight: '280px' }}>
        <div className="bg-neutral-900 text-white px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider">Detalle de Remitos</p>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="px-2 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider text-[9px] w-6">#</th>
              <th className="px-2 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Nº Remito</th>
              <th className="px-2 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Remitente</th>
              <th className="px-2 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Destinatario</th>
              <th className="px-2 py-2 text-center font-semibold text-neutral-500 uppercase tracking-wider text-[9px] w-14">Bultos</th>
              <th className="px-2 py-2 text-right font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Peso</th>
              <th className="px-2 py-2 text-right font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Valor</th>
              <th className="px-2 py-2 text-center font-semibold text-neutral-500 uppercase tracking-wider text-[9px] w-20">Paga</th>
            </tr>
          </thead>
          <tbody>
            {guia.remitos.map((remito, idx) => (
              <tr key={remito.id} className="border-b border-neutral-100">
                <td className="px-2 py-2 text-neutral-400">{idx + 1}</td>
                <td className="px-2 py-2 font-mono font-medium">{remito.delivery_note_number}</td>
                <td className={`px-2 py-2 truncate max-w-[100px] ${remito.paid_by === 'origen' ? 'font-bold' : ''}`} title={remito.sender_name}>{remito.sender_name}</td>
                <td className={`px-2 py-2 truncate max-w-[120px] ${remito.paid_by !== 'origen' ? 'font-bold' : ''}`} title={remito.recipient_name}>{remito.recipient_name}</td>
                <td className="px-2 py-2 text-center font-bold">{remito.package_quantity}</td>
                <td className="px-2 py-2 text-right font-mono">{formatNumber(remito.weight_kg)} kg</td>
                <td className="px-2 py-2 text-right font-mono">{formatCurrency(remito.declared_value)}</td>
                <td className="px-2 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    remito.paid_by === 'origen' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {remito.paid_by === 'origen' ? 'Remitente' : 'Destinatario'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-neutral-100 font-bold">
              <td colSpan={4} className="px-2 py-2 text-right uppercase text-[9px] text-neutral-500">Totales</td>
              <td className="px-2 py-2 text-center">{totalBultos}</td>
              <td className="px-2 py-2 text-right font-mono">{formatNumber(totalPeso)} kg</td>
              <td className="px-2 py-2 text-right font-mono">{formatCurrency(totalValor)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          OBSERVACIONES
      ══════════════════════════════════════════════════════════════ */}
      {guia.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">Observaciones</p>
          <p className="text-[11px] text-amber-900">{guia.notes}</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          FIRMAS
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="border border-neutral-200 rounded-lg p-3">
          <p className="text-[9px] text-neutral-400 mb-2 uppercase">Despacho Origen</p>
          <div className="border-b border-dashed border-neutral-300 h-10 mb-1"></div>
          <p className="text-[8px] text-neutral-400 text-center">Firma y Sello</p>
        </div>
        <div className="border border-neutral-200 rounded-lg p-3">
          <p className="text-[9px] text-neutral-400 mb-2 uppercase">Transportista</p>
          <div className="border-b border-dashed border-neutral-300 h-10 mb-1"></div>
          <p className="text-[8px] text-neutral-400 text-center">Firma Conductor</p>
        </div>
        <div className="border border-neutral-200 rounded-lg p-3">
          <p className="text-[9px] text-neutral-400 mb-2 uppercase">Recepción Destino</p>
          <div className="border-b border-dashed border-neutral-300 h-10 mb-1"></div>
          <p className="text-[8px] text-neutral-400 text-center">Firma y Sello</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-[8px] text-neutral-400 leading-relaxed max-w-xl mx-auto">
          Documento de control interno. La mercadería viaja por cuenta y riesgo del propietario según ley 26361.
        </p>
        <p className="text-[9px] text-neutral-500 mt-1 font-medium">{MERCURE.web}</p>
      </div>
    </div>
  );
}


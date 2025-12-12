"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/utils";
import { ChevronDown, Package, MapPin, DollarSign, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Shipment {
  id: number;
  delivery_note_number: string | null;
  status: string;
  package_quantity: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  declared_value: number | null;
  paid_by: string | null;
  payment_terms: string | null;
  created_at: string;
  recipient: { legal_name: string } | { legal_name: string }[] | null;
  sender: { legal_name: string } | { legal_name: string }[] | null;
  recipient_address: string | null;
}

function getLegalName(entity: { legal_name: string } | { legal_name: string }[] | null): string {
  if (!entity) return '-';
  if (Array.isArray(entity)) return entity[0]?.legal_name || '-';
  return entity.legal_name || '-';
}

// Mobile card para reparto en calle
function MobileEnRepartoCard({ shipment: s }: { shipment: Shipment }) {
  const [expanded, setExpanded] = useState(false);
  const isContado = s.payment_terms === 'contado';

  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left"
      >
        {/* Bultos */}
        <div className="flex items-center gap-1 shrink-0">
          <Package className="h-3.5 w-3.5 text-neutral-400" />
          <span className="font-semibold text-neutral-900">{s.package_quantity || '?'}</span>
        </div>

        {/* Destinatario + dirección */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-neutral-900 truncate text-sm">
            {getLegalName(s.recipient)}
          </p>
          {s.recipient_address && (
            <p className="text-xs text-neutral-500 truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {s.recipient_address}
            </p>
          )}
        </div>

        {/* Indicador cobro */}
        {isContado && (
          <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
            <DollarSign className="h-3 w-3" />
            {s.declared_value?.toLocaleString('es-AR')}
          </span>
        )}

        <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 bg-neutral-50/50">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-xs text-neutral-500">Remito</span>
              <p className="font-mono text-xs">{s.delivery_note_number || `#${s.id}`}</p>
            </div>
            <div>
              <span className="text-xs text-neutral-500">Peso</span>
              <p>{s.weight_kg ? `${s.weight_kg} kg` : '-'}</p>
            </div>
            <div>
              <span className="text-xs text-neutral-500">Remitente</span>
              <p className="truncate">{getLegalName(s.sender)}</p>
            </div>
            <div>
              <span className="text-xs text-neutral-500">Ingreso</span>
              <p>{timeAgo(s.created_at)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile card para finalizados
function MobileEntregadoCard({ shipment: s }: { shipment: Shipment }) {
  const isEntregada = s.status === 'entregada' || s.status === 'delivered';
  const isNoEntregada = s.status === 'no_entregada';

  return (
    <div className="px-3 py-2.5 flex items-center gap-2 border-b border-neutral-100 last:border-0">
      {/* Status icon */}
      {isEntregada ? (
        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
      ) : isNoEntregada ? (
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
      )}

      {/* Destinatario */}
      <p className="flex-1 text-sm font-medium text-neutral-900 truncate">
        {getLegalName(s.recipient)}
      </p>

      {/* Status label */}
      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
        isEntregada ? 'bg-green-50 text-green-700' : 
        isNoEntregada ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
      }`}>
        {isEntregada ? '✓' : isNoEntregada ? '⏳' : '✗'}
      </span>
    </div>
  );
}

interface DeliveryListProps {
  enReparto: Shipment[];
  entregados: Shipment[];
  totalCobrar: number;
}

export function DeliveryList({ enReparto, entregados, totalCobrar }: DeliveryListProps) {
  return (
    <>
      {/* En reparto */}
      <div className="border border-neutral-200 rounded overflow-hidden mb-4">
        <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-neutral-700">En Calle</span>
            <span className="text-xs text-neutral-500 ml-2">{enReparto.length}</span>
          </div>
          {totalCobrar > 0 && (
            <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
              ${totalCobrar.toLocaleString('es-AR')}
            </span>
          )}
        </div>
        
        {enReparto.length === 0 ? (
          <div className="p-4 text-center text-neutral-400 text-sm">
            No hay envíos en reparto
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden">
              {enReparto.map(s => (
                <MobileEnRepartoCard key={s.id} shipment={s} />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Dirección</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Bultos</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cobro</th>
                  </tr>
                </thead>
                <tbody>
                  {enReparto.map(s => {
                    const isContado = s.payment_terms === 'contado';
                    return (
                      <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs text-neutral-400">#{s.id}</span>
                          {s.delivery_note_number && (
                            <span className="ml-1 text-neutral-700">{s.delivery_note_number}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-neutral-700 truncate max-w-[120px]">
                          {getLegalName(s.recipient)}
                        </td>
                        <td className="px-3 py-2 text-neutral-500 text-xs truncate max-w-[180px]">
                          {s.recipient_address || '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-600">
                          {s.package_quantity || '-'}
                        </td>
                        <td className="px-3 py-2">
                          {isContado ? (
                            <span className="text-xs font-medium text-orange-600">
                              ${s.declared_value?.toLocaleString('es-AR')}
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-400">Cta Cte</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Entregados recientes */}
      <div className="border border-neutral-200 rounded overflow-hidden">
        <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
          <span className="text-sm font-medium text-neutral-700">Finalizados</span>
          <span className="text-xs text-neutral-500 ml-2 hidden md:inline">(recientes)</span>
        </div>
        
        {entregados.length === 0 ? (
          <div className="p-4 text-center text-neutral-400 text-sm">
            Sin entregas recientes
          </div>
        ) : (
          <>
            {/* Mobile cards - simplified */}
            <div className="md:hidden">
              {entregados.slice(0, 10).map(s => (
                <MobileEntregadoCard key={s.id} shipment={s} />
              ))}
              {entregados.length > 10 && (
                <div className="px-3 py-2 text-xs text-neutral-400 text-center">
                  +{entregados.length - 10} más
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {entregados.map(s => (
                    <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs text-neutral-400">#{s.id}</span>
                        {s.delivery_note_number && (
                          <span className="ml-1 text-neutral-700">{s.delivery_note_number}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-700 truncate max-w-[150px]">
                        {getLegalName(s.recipient)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          s.status === 'entregada' || s.status === 'delivered'
                            ? 'bg-green-50 text-green-700' 
                            : s.status === 'no_entregada'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {s.status === 'entregada' || s.status === 'delivered' ? 'Entregada' : 
                           s.status === 'no_entregada' ? 'No entregada' : 'Rechazada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}



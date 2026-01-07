"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/utils";
import { ChevronDown, Package, MapPin } from "lucide-react";
import Link from "next/link";

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
  trip_id: number | null;
  trip: { id: number; origin: string; destination: string; departure_date: string } | { id: number; origin: string; destination: string; departure_date: string }[] | null;
}

type TripData = { id: number; origin: string; destination: string; departure_date: string };

function getLegalName(entity: { legal_name: string } | { legal_name: string }[] | null): string {
  if (!entity) return '-';
  if (Array.isArray(entity)) return entity[0]?.legal_name || '-';
  return entity.legal_name || '-';
}

function getTrip(trip: Shipment['trip']): TripData | null {
  if (!trip) return null;
  if (Array.isArray(trip)) return trip[0] || null;
  return trip;
}

// Mobile: Card compacta expandible
function MobileShipmentCard({ shipment: s }: { shipment: Shipment }) {
  const [expanded, setExpanded] = useState(false);
  const isContado = s.payment_terms === 'contado';

  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center gap-3 text-left"
      >
        {/* Bultos */}
        <div className="flex items-center gap-1 shrink-0">
          <Package className="h-3.5 w-3.5 text-neutral-400" />
          <span className="font-semibold text-neutral-900">{s.package_quantity || '?'}</span>
        </div>

        {/* Destinatario */}
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

        {/* Indicador de cobro */}
        {isContado && (
          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded shrink-0">
            $
          </span>
        )}

        <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 bg-neutral-50/50">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-xs text-neutral-500">Peso</span>
              <p>{s.weight_kg ? `${s.weight_kg} kg` : '-'}</p>
            </div>
            <div>
              <span className="text-xs text-neutral-500">M³</span>
              <p>{s.volume_m3 || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-neutral-500">Valor</span>
              <p>{s.declared_value ? `$${s.declared_value.toLocaleString('es-AR')}` : '-'}</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-100 flex justify-between items-center">
            <span className="text-xs text-neutral-500">
              Remito: {s.delivery_note_number || `#${s.id}`}
            </span>
            <span className="text-xs text-neutral-400">
              {isContado ? 'Cobrar contra entrega' : 'Cuenta Corriente'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Desktop: Fila de tabla
function DesktopShipmentRow({ shipment: s }: { shipment: Shipment }) {
  const isContado = s.payment_terms === 'contado';

  return (
    <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-neutral-400">#{s.id}</span>
        {s.delivery_note_number && (
          <span className="ml-1 text-neutral-700">{s.delivery_note_number}</span>
        )}
      </td>
      <td className="px-3 py-2 text-neutral-700 truncate max-w-[150px]">
        {getLegalName(s.recipient)}
      </td>
      <td className="px-3 py-2 text-neutral-500 text-xs truncate max-w-[200px]">
        {s.recipient_address || '-'}
      </td>
      <td className="px-3 py-2 text-right text-neutral-600">{s.package_quantity || '-'}</td>
      <td className="px-3 py-2 text-right text-neutral-600">{s.weight_kg || '-'}</td>
      <td className="px-3 py-2 text-right text-neutral-600">{s.volume_m3 || '-'}</td>
      <td className="px-3 py-2 text-right text-neutral-600">
        {s.declared_value ? `$${s.declared_value.toLocaleString('es-AR')}` : '-'}
      </td>
      <td className="px-3 py-2">
        {isContado ? (
          <span className="text-xs font-medium text-orange-600">Contra entrega</span>
        ) : (
          <span className="text-xs text-neutral-400">Cta Cte</span>
        )}
      </td>
    </tr>
  );
}

// Grupo de viaje
function TripGroup({ trip, shipments }: { trip: TripData; shipments: Shipment[] }) {
  return (
    <div className="border border-neutral-200 rounded overflow-hidden">
      {/* Header del viaje */}
      <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/viajes/${trip.id}`} className="text-sm font-medium text-neutral-900 hover:text-orange-600">
              Viaje #{trip.id}
            </Link>
            <span className="text-xs text-neutral-500">
              {trip.origin} → {trip.destination}
            </span>
          </div>
          <span className="text-xs text-neutral-500">{shipments.length} env.</span>
        </div>
        {trip.departure_date && (
          <p className="text-xs text-neutral-400 mt-0.5">{timeAgo(trip.departure_date)}</p>
        )}
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden">
        {shipments.map(s => (
          <MobileShipmentCard key={s.id} shipment={s} />
        ))}
      </div>

      {/* Desktop: Tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Dirección</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Bultos</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Kg</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">M³</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Valor</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cobro</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map(s => (
              <DesktopShipmentRow key={s.id} shipment={s} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ShipmentTransitListProps {
  groups: { trip: TripData; shipments: Shipment[] }[];
  sinViaje: Shipment[];
}

export function ShipmentTransitList({ groups, sinViaje }: ShipmentTransitListProps) {
  if (groups.length === 0 && sinViaje.length === 0) {
    return (
      <div className="border border-neutral-200 rounded p-8 text-center">
        <p className="text-neutral-400 text-sm">No hay envíos en tránsito</p>
        <p className="text-neutral-300 text-xs mt-1">Los envíos aparecen aquí cuando se despachan en un viaje</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(({ trip, shipments }) => (
        <TripGroup key={trip.id} trip={trip} shipments={shipments} />
      ))}

      {sinViaje.length > 0 && (
        <div className="border border-neutral-200 rounded overflow-hidden">
          <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
            <span className="text-sm font-medium text-neutral-500">Sin viaje asignado</span>
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            {sinViaje.map(s => (
              <MobileShipmentCard key={s.id} shipment={s} />
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Dirección</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Bultos</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Kg</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">M³</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Valor</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cobro</th>
                </tr>
              </thead>
              <tbody>
                {sinViaje.map(s => (
                  <DesktopShipmentRow key={s.id} shipment={s} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}














"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, LayoutGrid, List, MapPin, Scale, Box } from "lucide-react";
import { TRIP_STATUS_LABELS } from "@/lib/types";
// Using regular img for external URLs

interface TripShipment {
  id: number;
  delivery_note_number: string;
  weight_kg: number | null;
  volume_m3: number | null;
  cargo_image_url: string | null;
  remito_image_url: string | null;
}

interface Trip {
  id: number;
  origin: string;
  destination: string;
  status: string;
  trip_type: string;
  departure_time: string | null;
  agreed_price: number | null;
  created_at: string;
  vehicle: {
    identifier: string;
    tractor_license_plate: string | null;
  } | null;
  shipments: TripShipment[];
  total_weight: number;
  total_volume: number;
  shipment_count: number;
}

function getStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case 'completed': case 'arrived': return 'success';
    case 'in_transit': return 'info';
    case 'loading': case 'planned': return 'warning';
    case 'cancelled': return 'error';
    default: return 'default';
  }
}

function formatCurrency(value: number | null): string {
  if (!value) return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value);
}

export function TripsListClient({ trips }: { trips: Trip[] }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const handleRowClick = (tripId: number) => {
    router.push(`/viajes/${tripId}`);
  };

  return (
    <>
      {/* View Toggle */}
      <div className="flex items-center justify-end gap-1 mb-3">
        <button
          onClick={() => setViewMode('table')}
          className={`p-2 rounded ${viewMode === 'table' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
          title="Vista tabla"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded ${viewMode === 'grid' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
          title="Vista grilla"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>

      {viewMode === 'table' ? (
        /* ============ VISTA TABLA ============ */
        <div className="border border-neutral-200 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Ruta</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Guías</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Vehículo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Peso/Vol</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Salida</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-neutral-400">Sin viajes</td></tr>
                ) : (
                  trips.map((t) => {
                    const isFTL = t.trip_type === 'camion_completo';
                    return (
                      <tr 
                        key={t.id} 
                        onClick={() => handleRowClick(t.id)}
                        className="border-b border-neutral-100 last:border-0 hover:bg-orange-50 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-2">
                          <span className="font-mono text-orange-500">#{t.id}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {isFTL ? (
                              <Truck className="w-4 h-4 text-orange-500" />
                            ) : (
                              <Package className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="text-xs text-neutral-600">
                              {isFTL ? 'FTL' : 'Cons.'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className="font-medium">{t.origin}</span>
                          <span className="text-neutral-400"> → </span>
                          <span>{t.destination}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm font-medium text-neutral-900">{t.shipment_count}</span>
                          <span className="text-xs text-neutral-400 ml-1">guías</span>
                        </td>
                        <td className="px-3 py-2">
                          {t.vehicle?.identifier ? (
                            <>
                              <div className="text-neutral-600 text-xs">{t.vehicle.identifier}</div>
                              <div className="font-mono text-neutral-400 text-[10px]">{t.vehicle.tractor_license_plate || ''}</div>
                            </>
                          ) : (
                            <div className="text-xs text-orange-600 flex items-center gap-1">🚛 Tercerizado</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-600">{t.total_weight.toFixed(1)} kg</span>
                            {t.total_volume > 0 && (
                              <span className="text-neutral-400">/ {t.total_volume.toFixed(1)} m³</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-neutral-600 text-xs whitespace-nowrap">
                          {t.departure_time ? new Date(t.departure_time).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={getStatusVariant(t.status)}>
                            {TRIP_STATUS_LABELS[t.status as keyof typeof TRIP_STATUS_LABELS] || t.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ============ VISTA GRILLA ============ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trips.length === 0 ? (
            <div className="col-span-full text-center py-12 text-neutral-400">Sin viajes</div>
          ) : (
            trips.map((t) => {
              const isFTL = t.trip_type === 'camion_completo';
              // Get up to 6 photos from shipments
              const photos = t.shipments
                .map(s => s.cargo_image_url || s.remito_image_url)
                .filter(Boolean)
                .slice(0, 6);
              
              return (
                <div
                  key={t.id}
                  onClick={() => handleRowClick(t.id)}
                  className="border border-neutral-200 rounded-lg overflow-hidden hover:border-orange-300 hover:shadow-md cursor-pointer transition-all bg-white"
                >
                  {/* Header */}
                  <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-orange-500 font-medium">#{t.id}</span>
                      <Badge variant={getStatusVariant(t.status)} className="text-[10px]">
                        {TRIP_STATUS_LABELS[t.status as keyof typeof TRIP_STATUS_LABELS] || t.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                      {isFTL ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                      {isFTL ? 'FTL' : 'Cons.'}
                    </div>
                  </div>

                  {/* Route */}
                  <div className="px-3 py-2 flex items-center gap-2 text-sm border-b border-neutral-100">
                    <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="font-medium">{t.origin}</span>
                    <span className="text-neutral-400">→</span>
                    <span>{t.destination}</span>
                  </div>

                  {/* Photos Grid */}
                  <div className="p-2 bg-neutral-100 min-h-[120px]">
                    {photos.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1">
                        {photos.map((url, idx) => (
                          <div key={idx} className="aspect-square bg-white rounded overflow-hidden border border-neutral-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url as string}
                              alt={`Carga ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                        {photos.length < t.shipment_count && (
                          <div className="aspect-square bg-white rounded border border-neutral-200 flex items-center justify-center text-neutral-400 text-xs">
                            +{t.shipment_count - photos.length}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-400 text-xs">
                        {t.shipment_count > 0 ? (
                          <span>{t.shipment_count} guías sin fotos</span>
                        ) : (
                          <span>Sin guías asignadas</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats Footer */}
                  <div className="px-3 py-2 flex items-center justify-between bg-white border-t border-neutral-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Box className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="font-medium">{t.shipment_count}</span>
                        <span className="text-neutral-400">guías</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Scale className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="font-medium">{t.total_weight.toFixed(0)}</span>
                        <span className="text-neutral-400">kg</span>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500">
                      {t.vehicle?.identifier || '🚛 Tercerizado'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}


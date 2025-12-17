"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Package, Truck, Check, Loader2, ChevronDown, MapPin } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

interface Shipment {
  id: number;
  delivery_note_number: string | null;
  status: string;
  package_quantity: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  declared_value: number | null;
  created_at: string;
  recipient: { legal_name: string } | { legal_name: string }[] | null;
  sender: { legal_name: string } | { legal_name: string }[] | null;
  recipient_address: string | null;
}

// Helper para extraer legal_name de relación
function getLegalName(entity: { legal_name: string } | { legal_name: string }[] | null): string {
  if (!entity) return '-';
  if (Array.isArray(entity)) return entity[0]?.legal_name || '-';
  return entity.legal_name || '-';
}

interface Trip {
  id: number;
  origin: string;
  destination: string;
  departure_date: string;
  status: string;
}

export default function ConsolidacionPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [viajes, setViajes] = useState<Trip[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cargar datos
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    
    const [shipmentsRes, viajesRes] = await Promise.all([
      supabase
        .schema('mercure').from('shipments')
        .select(`
          id, delivery_note_number, status, package_quantity, weight_kg, volume_m3,
          declared_value, created_at, recipient_address,
          sender:entities!sender_id(legal_name), 
          recipient:entities!recipient_id(legal_name)
        `)
        .in('status', ['ingresada', 'received', 'in_warehouse'])
        .is('trip_id', null)
        .order('created_at', { ascending: false }),
      supabase
        .schema('mercure').from('trips')
        .select('id, origin, destination, departure_date, status')
        .in('status', ['planned', 'loading'])
        .order('departure_date', { ascending: true })
    ]);

    setShipments((shipmentsRes.data || []) as Shipment[]);
    setViajes((viajesRes.data || []) as Trip[]);
    setIsLoading(false);
  }

  // Totales
  const totalBultos = shipments.reduce((acc, s) => acc + (s.package_quantity || 0), 0);
  const totalKg = shipments.reduce((acc, s) => acc + (s.weight_kg || 0), 0);
  const totalM3 = shipments.reduce((acc, s) => acc + (s.volume_m3 || 0), 0);

  // Totales de selección
  const selectedShipments = shipments.filter(s => selectedIds.has(s.id));
  const selectedBultos = selectedShipments.reduce((acc, s) => acc + (s.package_quantity || 0), 0);
  const selectedKg = selectedShipments.reduce((acc, s) => acc + (s.weight_kg || 0), 0);
  const selectedM3 = selectedShipments.reduce((acc, s) => acc + (s.volume_m3 || 0), 0);

  // Toggle selección
  function toggleSelection(id: number) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  // Seleccionar todos
  function toggleAll() {
    if (selectedIds.size === shipments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(shipments.map(s => s.id)));
    }
  }

  // Consolidar
  async function handleConsolidate() {
    if (selectedIds.size === 0) {
      setMessage({ type: 'error', text: 'Seleccioná al menos un envío' });
      return;
    }
    if (!selectedTripId) {
      setMessage({ type: 'error', text: 'Seleccioná un viaje' });
      return;
    }

    setIsConsolidating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentIds: Array.from(selectedIds),
          tripId: parseInt(selectedTripId)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al consolidar');
      }

      setMessage({ 
        type: 'success', 
        text: `${data.consolidated} envíos consolidados en Viaje #${data.tripId}` 
      });
      setSelectedIds(new Set());
      setSelectedTripId("");
      
      // Recargar datos
      await loadData();

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error al consolidar' 
      });
    } finally {
      setIsConsolidating(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-neutral-400" />
              <div>
                <h1 className="text-lg font-medium text-neutral-900">Consolidación</h1>
                <p className="text-xs text-neutral-500">
                  {shipments.length} envíos · {totalBultos} bultos · {totalKg.toFixed(1)}kg · {totalM3.toFixed(2)}m³
                </p>
              </div>
            </div>
            <Link href="/viajes/nuevo">
              <Button className="h-8 px-3 text-sm bg-neutral-900 hover:bg-neutral-800 text-white rounded w-full sm:w-auto">
                + Nuevo Viaje
              </Button>
            </Link>
          </div>

          {/* Mensaje */}
          {message && (
            <div className={`mb-4 px-3 py-2 rounded text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Viajes disponibles */}
          {viajes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                Viajes en preparación ({viajes.length})
              </p>
              <div className="flex gap-2 flex-wrap overflow-x-auto pb-2">
                {viajes.map((v) => (
                  <div 
                    key={v.id} 
                    className={`px-3 py-1.5 border rounded text-sm cursor-pointer transition-colors whitespace-nowrap ${
                      selectedTripId === String(v.id)
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                    onClick={() => setSelectedTripId(selectedTripId === String(v.id) ? "" : String(v.id))}
                  >
                    <span className="font-medium">#{v.id}</span>
                    <span className="text-neutral-500 ml-1">{v.origin} → {v.destination}</span>
                    <span className="text-neutral-400 ml-2 text-xs hidden sm:inline">
                      {new Date(v.departure_date).toLocaleDateString('es-AR')}
                    </span>
                    {v.status === 'loading' && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                        Cargando
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selección actual */}
          {selectedIds.size > 0 && (
            <div className="mb-4 px-3 py-2 bg-orange-50 border border-orange-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-sm text-orange-800">
                <span className="font-medium">{selectedIds.size} seleccionados</span>
                <span className="ml-2 sm:ml-3 text-orange-600 text-xs sm:text-sm">
                  {selectedBultos} bultos · {selectedKg.toFixed(1)}kg · {selectedM3.toFixed(2)}m³
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedTripId ? (
                  <Button 
                    onClick={handleConsolidate}
                    disabled={isConsolidating}
                    className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto"
                  >
                    {isConsolidating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Consolidando...
                      </>
                    ) : (
                      <>
                        <Truck className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Consolidar en Viaje #{selectedTripId}</span>
                        <span className="sm:hidden">Viaje #{selectedTripId}</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <span className="text-xs text-orange-600">← Seleccioná un viaje</span>
                )}
              </div>
            </div>
          )}

          {/* Estados de carga/vacío */}
          {isLoading ? (
            <div className="border border-neutral-200 rounded px-3 py-8 text-center text-neutral-400">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Cargando...
            </div>
          ) : shipments.length === 0 ? (
            <div className="border border-neutral-200 rounded px-3 py-8 text-center text-neutral-400">
              <Check className="h-5 w-5 mx-auto mb-2 text-green-500" />
              Sin envíos pendientes de consolidar
            </div>
          ) : (
            <>
              {/* Mobile View - Cards compactas */}
              <div className="md:hidden space-y-2">
                {/* Seleccionar todos - mobile */}
                <button 
                  onClick={toggleAll}
                  className="w-full px-3 py-2 text-xs text-neutral-500 border border-neutral-200 rounded bg-neutral-50"
                >
                  {selectedIds.size === shipments.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
                
                {shipments.map(s => (
                  <MobileShipmentCard 
                    key={s.id} 
                    shipment={s} 
                    isSelected={selectedIds.has(s.id)}
                    onToggle={() => toggleSelection(s.id)}
                  />
                ))}
              </div>

              {/* Desktop View - Tabla */}
              <div className="hidden md:block border border-neutral-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="px-3 py-2 text-left w-8">
                          <input 
                            type="checkbox" 
                            className="rounded border-neutral-300"
                            checked={selectedIds.size === shipments.length && shipments.length > 0}
                            onChange={toggleAll}
                          />
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remitente</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destino</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Bultos</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Kg</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">M³</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Ingreso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipments.map(s => (
                        <tr 
                          key={s.id} 
                          className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer ${
                            selectedIds.has(s.id) ? 'bg-orange-50' : ''
                          }`}
                          onClick={() => toggleSelection(s.id)}
                        >
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="rounded border-neutral-300"
                              checked={selectedIds.has(s.id)}
                              onChange={() => toggleSelection(s.id)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs text-neutral-400">#{s.id}</span>
                            {s.delivery_note_number && (
                              <span className="ml-1 text-neutral-700">{s.delivery_note_number}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-neutral-600 truncate max-w-[120px]">
                            {getLegalName(s.sender)}
                          </td>
                          <td className="px-3 py-2 text-neutral-700 font-medium truncate max-w-[120px]">
                            {getLegalName(s.recipient)}
                          </td>
                          <td className="px-3 py-2 text-neutral-500 text-xs truncate max-w-[150px]">
                            {s.recipient_address || '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-neutral-600">
                            {s.package_quantity || '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-neutral-600">
                            {s.weight_kg || '-'}
                          </td>
                          <td className="px-3 py-2 text-right text-neutral-600">
                            {s.volume_m3 || '-'}
                          </td>
                          <td className="px-3 py-2 text-neutral-400 text-xs">
                            {timeAgo(s.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Info de ayuda */}
          {shipments.length > 0 && viajes.length === 0 && (
            <div className="mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
              No hay viajes en preparación. <Link href="/viajes/nuevo" className="underline font-medium">Creá uno nuevo</Link> para poder consolidar envíos.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Mobile card component
function MobileShipmentCard({ 
  shipment: s, 
  isSelected, 
  onToggle 
}: { 
  shipment: Shipment; 
  isSelected: boolean; 
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded ${isSelected ? 'border-orange-300 bg-orange-50' : 'border-neutral-200 bg-white'}`}>
      <div className="flex items-center">
        {/* Checkbox */}
        <div className="px-3 py-3" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          <input 
            type="checkbox" 
            className="rounded border-neutral-300"
            checked={isSelected}
            onChange={onToggle}
          />
        </div>

        {/* Main content - clickable to expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-3 py-2.5 pr-3 text-left"
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

          {/* Tiempo */}
          <span className="text-xs text-neutral-400 shrink-0">
            {timeAgo(s.created_at)}
          </span>

          <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-neutral-100 bg-neutral-50/50 ml-10">
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
          <div className="mt-2 pt-2 border-t border-neutral-100 text-xs text-neutral-500">
            <span>Remitente: {getLegalName(s.sender)}</span>
            <span className="mx-2">·</span>
            <span>Remito: {s.delivery_note_number || `#${s.id}`}</span>
          </div>
        </div>
      )}
    </div>
  );
}

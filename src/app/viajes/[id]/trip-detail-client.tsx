"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ArrowLeft, Truck, Package, X, FileText, Printer, Send, MapPin, Search, Check } from "lucide-react";
import Link from "next/link";
import { TRIP_STATUS_LABELS } from "@/lib/types";

interface Trip {
  id: number;
  origin: string;
  destination: string;
  status: string;
  trip_type: string;
  departure_time: string | null;
  arrival_time: string | null;
  notes: string | null;
  driver_name?: string | null;
  driver_dni?: string | null;
  driver_phone?: string | null;
  vehicle?: {
    identifier: string;
    tractor_license_plate: string;
  };
}

interface Shipment {
  id: number;
  delivery_note_number: string;
  created_at: string;
  weight_kg: number | null;
  volume_m3: number | null;
  declared_value: number | null;
  freight_cost?: number | null;
  insurance_cost?: number | null;
  pickup_fee?: number | null;
  status: string;
  sender?: { id: number; legal_name: string } | null;
  recipient?: { id: number; legal_name: string } | null;
}

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
}

function getStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case 'completed': case 'arrived': case 'entregado': case 'rendida': return 'success';
    case 'in_transit': case 'en_transito': return 'info';
    case 'loading': case 'planned': case 'pendiente': return 'warning';
    case 'cancelled': return 'error';
    default: return 'default';
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value);
}

export function TripDetailClient({ 
  trip, 
  shipments: initialShipments, 
  entities
}: { 
  trip: Trip; 
  shipments: Shipment[]; 
  entities: Entity[];
}) {
  const router = useRouter();
  const [shipments, setShipments] = useState(initialShipments);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [dispatching, setDispatching] = useState(false);

  // Asignar guías existentes
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableShipments, setAvailableShipments] = useState<Array<{
    id: number;
    delivery_note_number: string;
    sender_name: string | null;
    recipient_name: string | null;
    weight_kg: number | null;
    declared_value: number | null;
  }>>([]);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<number[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [assigningShipments, setAssigningShipments] = useState(false);

  // Cargar guías disponibles
  const loadAvailableShipments = async () => {
    setLoadingAvailable(true);
    try {
      const response = await fetch(`/api/viajes/${trip.id}/assign-shipments`);
      const data = await response.json();
      if (data.shipments) {
        setAvailableShipments(data.shipments);
      }
    } catch (err) {
      console.error('Error loading available shipments:', err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleOpenAssignModal = () => {
    setShowAssignModal(true);
    setSelectedShipmentIds([]);
    loadAvailableShipments();
  };

  const toggleShipmentSelection = (id: number) => {
    setSelectedShipmentIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const handleAssignShipments = async () => {
    if (selectedShipmentIds.length === 0) return;
    
    setAssigningShipments(true);
    try {
      const response = await fetch(`/api/viajes/${trip.id}/assign-shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentIds: selectedShipmentIds }),
      });
      
      if (response.ok) {
        setShowAssignModal(false);
        router.refresh();
        window.location.reload();
      } else {
        const result = await response.json();
        setError(result.error || 'Error al asignar');
      }
    } catch (err) {
      setError('Error al asignar guías');
    } finally {
      setAssigningShipments(false);
    }
  };

  const handleRemoveShipment = async (shipmentId: number) => {
    if (!confirm('¿Quitar este remito del viaje?')) return;
    
    try {
      await fetch(`/api/viajes/${trip.id}/assign-shipments?shipmentId=${shipmentId}`, {
        method: 'DELETE',
      });
      setShipments(prev => prev.filter(s => s.id !== shipmentId));
    } catch (err) {
      console.error('Error removing shipment:', err);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    delivery_note_number: '',
    sender_id: '',
    recipient_id: '',
    weight_kg: '',
    volume_m3: '',
    declared_value: '',
    freight_cost: '',
    insurance_cost: '',
    origin: trip.origin,
    destination: trip.destination,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAddShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!formData.delivery_note_number) {
        throw new Error('Nº de remito es requerido');
      }
      if (!formData.sender_id) {
        throw new Error('Remitente es requerido');
      }

      const response = await fetch(`/api/viajes/${trip.id}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_note_number: formData.delivery_note_number,
          sender_id: parseInt(formData.sender_id),
          recipient_id: formData.recipient_id ? parseInt(formData.recipient_id) : null,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
          volume_m3: formData.volume_m3 ? parseFloat(formData.volume_m3) : null,
          declared_value: formData.declared_value ? parseFloat(formData.declared_value) : null,
          freight_cost: formData.freight_cost ? parseFloat(formData.freight_cost) : null,
          insurance_cost: formData.insurance_cost ? parseFloat(formData.insurance_cost) : null,
          origin: formData.origin,
          destination: formData.destination,
          status: 'rendida',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar');
      }

      // Reload page to get updated data
      router.refresh();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintHojaRuta = () => {
    window.open(`/viajes/${trip.id}/hoja-ruta`, '_blank');
  };

  const handleDispatch = async () => {
    if (!confirm(`¿Despachar el viaje #${trip.id} con ${shipments.length} guías? Las guías pasarán a "En Destino".`)) {
      return;
    }
    
    setDispatching(true);
    setError(null);
    
    try {
      const response = await fetch('/api/dispatch-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: trip.id, directToDestination: true }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al despachar');
      }
      
      // Reload page to reflect changes
      router.refresh();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al despachar');
    } finally {
      setDispatching(false);
    }
  };

  const totalFlete = shipments.reduce((sum, s) => sum + (s.freight_cost || 0), 0);
  const totalSeguro = shipments.reduce((sum, s) => sum + (s.insurance_cost || 0), 0);

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/viajes"
            className="text-neutral-400 hover:text-neutral-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-medium text-neutral-900">Viaje #{trip.id}</h1>
              <Badge variant={getStatusVariant(trip.status)}>
                {TRIP_STATUS_LABELS[trip.status as keyof typeof TRIP_STATUS_LABELS] || trip.status}
              </Badge>
            </div>
            <p className="text-sm text-neutral-500">
              {trip.origin} → {trip.destination}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintHojaRuta}
            className="h-8 px-3 text-sm border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Hoja de Ruta
          </button>
          {['planned', 'loading'].includes(trip.status) && (
            <button
              onClick={handleOpenAssignModal}
              className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Asignar Guías
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="h-8 px-3 text-sm border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear Nuevo
          </button>
          {['planned', 'loading'].includes(trip.status) && shipments.length > 0 && (
            <button
              onClick={handleDispatch}
              disabled={dispatching}
              className={`h-8 px-3 text-sm ${trip.trip_type === 'ultima_milla' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'} disabled:bg-neutral-300 text-white rounded flex items-center gap-2`}
            >
              {dispatching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {trip.trip_type === 'ultima_milla' ? 'Entregar al Cliente' : 'Despachar a Destino'}
            </button>
          )}
          {trip.status === 'arrived' && (
            <span className="h-8 px-3 text-sm bg-purple-100 text-purple-700 rounded flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              En Destino
            </span>
          )}
          {trip.status === 'completed' && (
            <span className="h-8 px-3 text-sm bg-green-100 text-green-700 rounded flex items-center gap-2">
              <Check className="w-4 h-4" />
              Entregado
            </span>
          )}
        </div>
      </div>

      {/* Trip Info */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="border border-neutral-200 rounded p-3">
          <div className="text-xs text-neutral-500 uppercase mb-1">Vehículo</div>
          {trip.vehicle?.identifier ? (
            <>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-medium">
                  {trip.vehicle.identifier}
                </span>
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                {trip.vehicle.tractor_license_plate || '-'}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg">🚛</span>
              <span className="text-sm font-medium text-orange-600">
                Tercerizado
              </span>
            </div>
          )}
        </div>
        <div className="border border-orange-200 bg-orange-50 rounded p-3">
          <div className="text-xs text-orange-600 uppercase mb-1 flex items-center gap-1">
            <Truck className="w-3 h-3" /> Conductor
          </div>
          <div className="text-sm font-medium text-neutral-900">
            {trip.driver_name || '-'}
          </div>
          {trip.driver_dni && (
            <div className="text-xs text-neutral-500 mt-1">
              DNI: {trip.driver_dni}
              {trip.driver_phone && ` · ${trip.driver_phone}`}
            </div>
          )}
        </div>
        <div className="border border-neutral-200 rounded p-3">
          <div className="text-xs text-neutral-500 uppercase mb-1">Salida</div>
          <div className="text-sm font-medium">
            {trip.departure_time 
              ? new Date(trip.departure_time).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
              : '-'}
          </div>
        </div>
        <div className="border border-neutral-200 rounded p-3">
          <div className="text-xs text-neutral-500 uppercase mb-1">Llegada</div>
          <div className="text-sm font-medium">
            {trip.arrival_time 
              ? new Date(trip.arrival_time).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
              : '-'}
          </div>
        </div>
        <div className="border border-neutral-200 rounded p-3">
          <div className="text-xs text-neutral-500 uppercase mb-1">Guías</div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium">{shipments.length}</span>
          </div>
        </div>
      </div>


      {/* Add Shipment Form */}
      {showAddForm && (
        <div className="border border-orange-200 bg-orange-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-neutral-900">Nueva Guía</h3>
            <button onClick={() => setShowAddForm(false)} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleAddShipment} className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Nº Guía *
              </label>
              <input
                type="text"
                name="delivery_note_number"
                value={formData.delivery_note_number}
                onChange={handleChange}
                placeholder="0001-00000123"
                className="w-full h-9 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Remitente *
              </label>
              <select
                name="sender_id"
                value={formData.sender_id}
                onChange={handleChange}
                className="w-full h-9 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              >
                <option value="">Seleccionar...</option>
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.legal_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Destinatario
              </label>
              <select
                name="recipient_id"
                value={formData.recipient_id}
                onChange={handleChange}
                className="w-full h-9 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              >
                <option value="">Seleccionar...</option>
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.legal_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Valor Declarado
              </label>
              <input
                type="number"
                name="declared_value"
                value={formData.declared_value}
                onChange={handleChange}
                placeholder="0"
                className="w-full h-9 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Peso (kg)
              </label>
              <input
                type="number"
                name="weight_kg"
                value={formData.weight_kg}
                onChange={handleChange}
                step="0.01"
                className="w-full h-9 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Volumen (m³)
              </label>
              <input
                type="number"
                name="volume_m3"
                value={formData.volume_m3}
                onChange={handleChange}
                step="0.01"
                className="w-full h-9 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Flete $
              </label>
              <input
                type="number"
                name="freight_cost"
                value={formData.freight_cost}
                onChange={handleChange}
                step="0.01"
                className="w-full h-9 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Seguro $
              </label>
              <input
                type="number"
                name="insurance_cost"
                value={formData.insurance_cost}
                onChange={handleChange}
                step="0.01"
                className="w-full h-9 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              />
            </div>

            <div className="col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="h-9 px-4 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-300 text-white rounded text-sm flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Agregar Guía
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shipments Table */}
      <div className="border border-neutral-200 rounded overflow-hidden">
        <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700">Guías del Viaje</span>
          <div className="text-xs text-neutral-500">
            Total Flete: <span className="font-medium text-neutral-700">{formatCurrency(totalFlete)}</span>
            {' · '}
            Total Seguro: <span className="font-medium text-neutral-700">{formatCurrency(totalSeguro)}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Guía Kalia</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remitente</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Peso</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">V. Decl.</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Estado</th>
                {['planned', 'loading'].includes(trip.status) && (
                  <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase w-10"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                    No hay guías. Usá <strong>"Asignar Guías"</strong> para agregar guías existentes.
                  </td>
                </tr>
              ) : (
                shipments.map((s) => {
                  const sender = Array.isArray(s.sender) ? s.sender[0] : s.sender;
                  const recipient = Array.isArray(s.recipient) ? s.recipient[0] : s.recipient;
                  return (
                    <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-3 py-2 font-mono text-xs text-orange-600 font-medium whitespace-nowrap">
                        R0005-{String(s.id).padStart(8, '0')}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{s.delivery_note_number || '-'}</td>
                      <td className="px-3 py-2 text-neutral-700 text-xs">{sender?.legal_name || '-'}</td>
                      <td className="px-3 py-2 text-neutral-600 text-xs">{recipient?.legal_name || '-'}</td>
                      <td className="px-3 py-2 text-right text-neutral-600 text-xs">{s.weight_kg ? `${s.weight_kg} kg` : '-'}</td>
                      <td className="px-3 py-2 text-right text-neutral-600 text-xs">{s.declared_value ? formatCurrency(s.declared_value) : '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={getStatusVariant(s.status)}>
                          {s.status}
                        </Badge>
                      </td>
                      {['planned', 'loading'].includes(trip.status) && (
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleRemoveShipment(s.id)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                            title="Quitar del viaje"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Asignar Guías */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between bg-orange-50">
              <div>
                <h3 className="font-medium text-neutral-900">Asignar Guías al Viaje</h3>
                <p className="text-xs text-neutral-500">Seleccioná las guías de recepción para cargar al camión</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {loadingAvailable ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                </div>
              ) : availableShipments.length === 0 ? (
                <div className="text-center py-8 text-neutral-400">
                  No hay guías disponibles en recepción
                </div>
              ) : (
                <div className="space-y-2">
                  {availableShipments.map((s) => (
                    <div 
                      key={s.id}
                      onClick={() => toggleShipmentSelection(s.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedShipmentIds.includes(s.id)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            selectedShipmentIds.includes(s.id)
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'border-neutral-300'
                          }`}>
                            {selectedShipmentIds.includes(s.id) && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <p className="font-mono text-sm font-medium text-orange-600">
                              R0005-{String(s.id).padStart(8, '0')}
                            </p>
                            <p className="text-xs text-neutral-600">
                              Remito: {s.delivery_note_number || '-'}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {s.sender_name || 'Sin remitente'} → {s.recipient_name || 'Sin destinatario'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-xs text-neutral-500">
                          {s.weight_kg && <span>{s.weight_kg} kg</span>}
                          {s.declared_value && <span className="ml-2">${s.declared_value.toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <span className="text-sm text-neutral-600">
                {selectedShipmentIds.length} guía{selectedShipmentIds.length !== 1 ? 's' : ''} seleccionada{selectedShipmentIds.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="h-8 px-4 text-sm border border-neutral-200 hover:bg-neutral-100 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAssignShipments}
                  disabled={selectedShipmentIds.length === 0 || assigningShipments}
                  className="h-8 px-4 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-300 text-white rounded flex items-center gap-2"
                >
                  {assigningShipments ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  Asignar al Viaje
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



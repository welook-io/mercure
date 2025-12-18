"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ArrowLeft, Truck, Package, X } from "lucide-react";
import Link from "next/link";
import { TRIP_STATUS_LABELS } from "@/lib/types";

interface Trip {
  id: number;
  origin: string;
  destination: string;
  status: string;
  departure_time: string | null;
  arrival_time: string | null;
  notes: string | null;
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
  freight_cost: number | null;
  insurance_cost: number | null;
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

      const { data, error: insertError } = await supabase
        .schema('mercure').from('shipments')
        .insert({
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
          trip_id: trip.id,
          status: 'rendida', // Marcamos como rendido para que aparezca en cuenta corriente
        })
        .select(`
          *,
          sender:entities!shipments_sender_id_fkey(id, legal_name),
          recipient:entities!shipments_recipient_id_fkey(id, legal_name)
        `)
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Add to local state
      setShipments(prev => [data, ...prev]);
      
      // Reset form
      setFormData({
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
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
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
        <button
          onClick={() => setShowAddForm(true)}
          className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar Remito
        </button>
      </div>

      {/* Trip Info */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="border border-neutral-200 rounded p-3">
          <div className="text-xs text-neutral-500 uppercase mb-1">Vehículo</div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium">
              {trip.vehicle?.identifier || '-'}
            </span>
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {trip.vehicle?.tractor_license_plate || '-'}
          </div>
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
          <div className="text-xs text-neutral-500 uppercase mb-1">Remitos</div>
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
            <h3 className="font-medium text-neutral-900">Nuevo Remito</h3>
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
                Nº Remito *
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
                    Agregar Remito
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
          <span className="text-sm font-medium text-neutral-700">Remitos del Viaje</span>
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
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remitente</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Peso</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Vol.</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">V. Decl.</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Flete</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Seguro</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-neutral-400">
                    No hay remitos cargados. Usa "Agregar Remito" para cargar remitos manualmente.
                  </td>
                </tr>
              ) : (
                shipments.map((s) => {
                  const sender = Array.isArray(s.sender) ? s.sender[0] : s.sender;
                  const recipient = Array.isArray(s.recipient) ? s.recipient[0] : s.recipient;
                  return (
                    <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-3 py-2 font-mono text-xs">{s.delivery_note_number}</td>
                      <td className="px-3 py-2 text-neutral-700">{sender?.legal_name || '-'}</td>
                      <td className="px-3 py-2 text-neutral-600">{recipient?.legal_name || '-'}</td>
                      <td className="px-3 py-2 text-right text-neutral-600">{s.weight_kg ? `${s.weight_kg} kg` : '-'}</td>
                      <td className="px-3 py-2 text-right text-neutral-600">{s.volume_m3 ? `${s.volume_m3} m³` : '-'}</td>
                      <td className="px-3 py-2 text-right text-neutral-600">{s.declared_value ? formatCurrency(s.declared_value) : '-'}</td>
                      <td className="px-3 py-2 text-right font-medium">{s.freight_cost ? formatCurrency(s.freight_cost) : '-'}</td>
                      <td className="px-3 py-2 text-right text-neutral-600">{s.insurance_cost ? formatCurrency(s.insurance_cost) : '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={getStatusVariant(s.status)}>
                          {s.status}
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
    </div>
  );
}



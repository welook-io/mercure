"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ArrowLeft, Truck, Package, X, FileText, User, Printer, Users, Trash2 } from "lucide-react";
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

interface Guide {
  id: number;
  guide_name: string;
  guide_dni: string | null;
  guide_phone: string | null;
  role: string;
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
  entities,
  initialGuides = []
}: { 
  trip: Trip; 
  shipments: Shipment[]; 
  entities: Entity[];
  initialGuides?: Guide[];
}) {
  const router = useRouter();
  const [shipments, setShipments] = useState(initialShipments);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Guías
  const [guides, setGuides] = useState<Guide[]>(initialGuides);
  const [showAddGuide, setShowAddGuide] = useState(false);
  const [guideForm, setGuideForm] = useState({
    guide_name: '',
    guide_dni: '',
    guide_phone: '',
    role: 'acompanante',
  });
  const [savingGuide, setSavingGuide] = useState(false);

  // Cargar guías al montar
  useEffect(() => {
    async function loadGuides() {
      try {
        const response = await fetch(`/api/viajes/${trip.id}/guides`);
        const data = await response.json();
        if (data.guides) {
          setGuides(data.guides);
        }
      } catch (err) {
        console.error('Error loading guides:', err);
      }
    }
    if (initialGuides.length === 0) {
      loadGuides();
    }
  }, [trip.id, initialGuides.length]);

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

  const handleAddGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGuide(true);
    try {
      const response = await fetch(`/api/viajes/${trip.id}/guides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guideForm),
      });
      const result = await response.json();
      if (response.ok && result.guide) {
        setGuides(prev => [...prev, result.guide]);
        setGuideForm({ guide_name: '', guide_dni: '', guide_phone: '', role: 'acompanante' });
        setShowAddGuide(false);
      } else {
        setError(result.error || 'Error al agregar guía');
      }
    } catch (err) {
      setError('Error al agregar guía');
    } finally {
      setSavingGuide(false);
    }
  };

  const handleDeleteGuide = async (guideId: number) => {
    try {
      await fetch(`/api/viajes/${trip.id}/guides?guideId=${guideId}`, {
        method: 'DELETE',
      });
      setGuides(prev => prev.filter(g => g.id !== guideId));
    } catch (err) {
      console.error('Error deleting guide:', err);
    }
  };

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
          <button
            onClick={() => setShowAddForm(true)}
            className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar Remito
          </button>
        </div>
      </div>

      {/* Trip Info */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
        <div className="border border-orange-200 bg-orange-50 rounded p-3">
          <div className="text-xs text-orange-600 uppercase mb-1 flex items-center gap-1">
            <User className="w-3 h-3" /> Conductor
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
          <div className="text-xs text-neutral-500 uppercase mb-1">Remitos</div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium">{shipments.length}</span>
          </div>
        </div>
      </div>

      {/* Guías / Acompañantes */}
      <div className="border border-neutral-200 rounded overflow-hidden mb-6">
        <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Guías y Acompañantes ({guides.length})
          </span>
          <button
            onClick={() => setShowAddGuide(!showAddGuide)}
            className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Agregar Guía
          </button>
        </div>
        
        {/* Formulario agregar guía */}
        {showAddGuide && (
          <div className="p-3 bg-orange-50 border-b border-orange-200">
            <form onSubmit={handleAddGuide} className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={guideForm.guide_name}
                  onChange={(e) => setGuideForm(prev => ({ ...prev, guide_name: e.target.value }))}
                  placeholder="Nombre completo"
                  className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">DNI</label>
                <input
                  type="text"
                  value={guideForm.guide_dni}
                  onChange={(e) => setGuideForm(prev => ({ ...prev, guide_dni: e.target.value }))}
                  placeholder="12.345.678"
                  className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={guideForm.guide_phone}
                  onChange={(e) => setGuideForm(prev => ({ ...prev, guide_phone: e.target.value }))}
                  placeholder="011-1234-5678"
                  className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Rol</label>
                <select
                  value={guideForm.role}
                  onChange={(e) => setGuideForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                >
                  <option value="conductor">Conductor</option>
                  <option value="acompanante">Acompañante</option>
                  <option value="auxiliar">Auxiliar</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={savingGuide}
                  className="h-8 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center gap-1"
                >
                  {savingGuide ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Agregar
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGuide(false)}
                  className="h-8 px-3 text-xs border border-neutral-200 hover:bg-neutral-100 rounded"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Lista de guías */}
        {guides.length === 0 ? (
          <div className="px-4 py-3 text-sm text-neutral-400 text-center">
            No hay guías asignados a este viaje
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {guides.map((guide) => (
              <div key={guide.id} className="px-4 py-2 flex items-center justify-between hover:bg-neutral-50">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-neutral-400" />
                  <div>
                    <span className="text-sm font-medium">{guide.guide_name}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      guide.role === 'conductor' ? 'bg-orange-100 text-orange-700' : 
                      guide.role === 'auxiliar' ? 'bg-blue-100 text-blue-700' : 
                      'bg-neutral-100 text-neutral-600'
                    }`}>
                      {guide.role === 'conductor' ? 'Conductor' : guide.role === 'auxiliar' ? 'Auxiliar' : 'Acompañante'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {guide.guide_dni && (
                    <span className="text-xs text-neutral-500">DNI: {guide.guide_dni}</span>
                  )}
                  {guide.guide_phone && (
                    <span className="text-xs text-neutral-500">{guide.guide_phone}</span>
                  )}
                  <button
                    onClick={() => handleDeleteGuide(guide.id)}
                    className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                    title="Eliminar guía"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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



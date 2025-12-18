"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { updateVehicle, createVehicleEvent, deleteVehicleEvent } from "./actions";
import Link from "next/link";
import { ArrowLeft, Truck, Save, Calendar, Gauge, Plus, Wrench, FileCheck, ShoppingCart, AlertTriangle, Trash2, X, Bell, Clock, Car, Upload, Image } from "lucide-react";

interface Vehicle {
  id: number;
  identifier: string;
  tractor_license_plate: string | null;
  trailer_license_plate: string | null;
  brand: string | null;
  model: string | null;
  vehicle_type: string | null;
  year: number | null;
  pallet_capacity: number | null;
  weight_capacity_kg: number | null;
  capacity_m3: number | null;
  max_weight_kg: number | null;
  has_forklift: boolean;
  has_hydraulic_ramp: boolean;
  has_thermal_control: boolean;
  image_url: string | null;
  current_km: number | null;
  purchase_date: string | null;
  purchase_km: number | null;
  purchase_condition: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface VehicleEvent {
  id: number;
  vehicle_id: number;
  event_type: string;
  event_date: string;
  km_at_event: number | null;
  cost: number | null;
  provider: string | null;
  description: string | null;
  next_date: string | null;
  next_km: number | null;
  created_at: string;
}

const VEHICLE_TYPES = ["UTILITARIO","FURGON","FURGON TERMICO","CHASIS C/CABINA","SEMIRREMOLQUE","CAMION","CAMIONETA","TRACTOR","AUTO","MOTO"];
const BRANDS = ["RENAULT","MERCEDES BENZ","IVECO","SCANIA","VOLVO","VOLKSWAGEN","FORD","FIAT","PEUGEOT","CITROEN","TOYOTA","CHEVROLET","HONDA","HYUNDAI","KIA","NISSAN","OTRO"];

const EVENT_TYPES = [
  { value: "compra", label: "Compra", icon: ShoppingCart, color: "bg-green-50 text-green-700" },
  { value: "chequeo_km", label: "Chequeo Km", icon: Gauge, color: "bg-indigo-50 text-indigo-700" },
  { value: "service", label: "Service", icon: Wrench, color: "bg-blue-50 text-blue-700" },
  { value: "vtv", label: "VTV", icon: FileCheck, color: "bg-purple-50 text-purple-700" },
  { value: "reparacion", label: "Reparación", icon: AlertTriangle, color: "bg-amber-50 text-amber-700" },
  { value: "control", label: "Control", icon: FileCheck, color: "bg-neutral-100 text-neutral-600" },
  { value: "seguro", label: "Seguro", icon: FileCheck, color: "bg-cyan-50 text-cyan-700" },
  { value: "patente", label: "Patente", icon: FileCheck, color: "bg-orange-50 text-orange-700" },
  { value: "combustible", label: "Combustible", icon: Car, color: "bg-red-50 text-red-700" },
  { value: "otro", label: "Otro", icon: FileCheck, color: "bg-neutral-100 text-neutral-600" },
];

interface Reminder {
  id: number;
  eventType: string;
  label: string;
  dueDate?: string;
  dueKm?: number;
  daysRemaining?: number;
  kmRemaining?: number;
  isOverdue: boolean;
  isUrgent: boolean;
}

interface Props {
  vehicle: Vehicle;
  initialEvents: VehicleEvent[];
}

export default function VehicleDetailClient({ vehicle, initialEvents }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [events, setEvents] = useState<VehicleEvent[]>(initialEvents);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const currentKm = useMemo(() => {
    const eventsWithKm = events.filter(e => e.km_at_event !== null);
    if (eventsWithKm.length === 0) return vehicle.purchase_km || 0;
    const sorted = [...eventsWithKm].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
    return sorted[0].km_at_event || 0;
  }, [events, vehicle.purchase_km]);

  const reminders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderList: Reminder[] = [];

    events.forEach(event => {
      if (!event.next_date && !event.next_km) return;
      const config = EVENT_TYPES.find(e => e.value === event.event_type);
      const reminder: Reminder = { id: event.id, eventType: event.event_type, label: config?.label || event.event_type, isOverdue: false, isUrgent: false };

      if (event.next_date) {
        const dueDate = new Date(event.next_date);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        reminder.dueDate = event.next_date;
        reminder.daysRemaining = diffDays;
        reminder.isOverdue = diffDays < 0;
        reminder.isUrgent = diffDays >= 0 && diffDays <= 15;
      }

      if (event.next_km && currentKm) {
        reminder.dueKm = event.next_km;
        reminder.kmRemaining = event.next_km - currentKm;
        if (reminder.kmRemaining <= 0) reminder.isOverdue = true;
        if (reminder.kmRemaining > 0 && reminder.kmRemaining <= 1000) reminder.isUrgent = true;
      }
      reminderList.push(reminder);
    });

    return reminderList.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return (a.daysRemaining || 999) - (b.daysRemaining || 999);
    });
  }, [events, currentKm]);

  const [formData, setFormData] = useState({
    identifier: vehicle.identifier,
    brand: vehicle.brand || "",
    model: vehicle.model || "",
    vehicle_type: vehicle.vehicle_type || "",
    year: vehicle.year || new Date().getFullYear(),
    tractor_license_plate: vehicle.tractor_license_plate || "",
    trailer_license_plate: vehicle.trailer_license_plate || "",
    pallet_capacity: vehicle.pallet_capacity?.toString() || "",
    weight_capacity_kg: (vehicle.weight_capacity_kg || vehicle.max_weight_kg)?.toString() || "",
    capacity_m3: vehicle.capacity_m3?.toString() || "",
    has_forklift: vehicle.has_forklift || false,
    has_hydraulic_ramp: vehicle.has_hydraulic_ramp || false,
    has_thermal_control: vehicle.has_thermal_control || false,
    purchase_date: vehicle.purchase_date || "",
    purchase_km: vehicle.purchase_km?.toString() || "",
    purchase_condition: vehicle.purchase_condition || "used",
    is_active: vehicle.is_active,
    notes: vehicle.notes || "",
  });

  const [imageUrl, setImageUrl] = useState<string | null>(vehicle.image_url);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('vehicleId', vehicle.id.toString());

      const response = await fetch('/api/vehiculos/upload-image', {
        method: 'POST',
        body: formDataUpload,
      });

      const result = await response.json();
      if (response.ok && result.url) {
        setImageUrl(result.url);
        setSuccess('Imagen subida correctamente');
      } else {
        setError(result.error || 'Error al subir imagen');
      }
    } catch (err) {
      setError('Error al subir imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const [newEvent, setNewEvent] = useState({
    event_type: "chequeo_km",
    event_date: new Date().toISOString().split('T')[0],
    km_at_event: "",
    cost: "",
    provider: "",
    description: "",
    next_date: "",
    next_km: "",
  });

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updateVehicle(vehicle.id, {
        identifier: formData.identifier.toUpperCase(),
        brand: formData.brand || null,
        model: formData.model || null,
        vehicle_type: formData.vehicle_type || null,
        year: formData.year || null,
        tractor_license_plate: formData.tractor_license_plate.toUpperCase() || null,
        trailer_license_plate: formData.trailer_license_plate.toUpperCase() || null,
        pallet_capacity: formData.pallet_capacity ? parseInt(formData.pallet_capacity) : null,
        weight_capacity_kg: formData.weight_capacity_kg ? parseFloat(formData.weight_capacity_kg) : null,
        capacity_m3: formData.capacity_m3 ? parseFloat(formData.capacity_m3) : null,
        has_forklift: formData.has_forklift,
        has_hydraulic_ramp: formData.has_hydraulic_ramp,
        has_thermal_control: formData.has_thermal_control,
        current_km: null,
        purchase_date: formData.purchase_date || null,
        purchase_km: formData.purchase_km ? parseInt(formData.purchase_km) : null,
        purchase_condition: formData.purchase_condition,
        is_active: formData.is_active,
        notes: formData.notes || null,
      });
      setSuccess("Vehículo actualizado");
      setEditMode(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await createVehicleEvent({
        vehicle_id: vehicle.id,
        event_type: newEvent.event_type,
        event_date: newEvent.event_date,
        km_at_event: newEvent.km_at_event ? parseInt(newEvent.km_at_event) : null,
        cost: newEvent.cost ? parseFloat(newEvent.cost) : null,
        provider: newEvent.provider || null,
        description: newEvent.description || null,
        next_date: newEvent.next_date || null,
        next_km: newEvent.next_km ? parseInt(newEvent.next_km) : null,
      });
      setEvents([data as VehicleEvent, ...events]);
      setShowEventForm(false);
      setNewEvent({ event_type: "chequeo_km", event_date: new Date().toISOString().split('T')[0], km_at_event: "", cost: "", provider: "", description: "", next_date: "", next_km: "" });
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al crear evento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      await deleteVehicleEvent(eventId);
      setEvents(events.filter(e => e.id !== eventId));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const getEventConfig = (type: string) => EVENT_TYPES.find(e => e.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
  const formatDate = (date: string) => new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="px-3 sm:px-4 py-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <Link href="/vehiculos"><Button variant="ghost" size="sm" className="h-8 px-2"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <Truck className="w-5 h-5 text-neutral-400" />
          <div>
            <h1 className="text-lg font-medium text-neutral-900 font-mono">{vehicle.identifier}</h1>
            <p className="text-xs text-neutral-500">{vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`}</p>
          </div>
          <Badge variant={vehicle.is_active ? 'success' : 'error'}>{vehicle.is_active ? 'Activo' : 'Inactivo'}</Badge>
          <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-indigo-50 rounded text-indigo-700">
            <Gauge className="w-3 h-3" />
            <span className="text-sm font-medium">{currentKm.toLocaleString('es-AR')} km</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <Button onClick={() => setEditMode(true)} variant="outline" className="h-8 px-3 text-sm">Editar</Button>
          ) : (
            <>
              <Button onClick={() => setEditMode(false)} variant="ghost" className="h-8 px-3 text-sm">Cancelar</Button>
              <Button onClick={handleSave} disabled={loading} className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white">
                <Save className="w-4 h-4 mr-1" />Guardar
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{success}</div>}

      {reminders.length > 0 && (
        <div className="mb-4 border border-neutral-200 rounded">
          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border-b border-neutral-100">
            <Bell className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium">Recordatorios</h2>
            <Badge variant="default" className="text-xs">{reminders.length}</Badge>
          </div>
          <div className="divide-y divide-neutral-100">
            {reminders.map((reminder) => {
              const config = getEventConfig(reminder.eventType);
              return (
                <div key={reminder.id} className={`px-3 py-2 flex items-center justify-between ${reminder.isOverdue ? 'bg-red-50' : reminder.isUrgent ? 'bg-amber-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}>{reminder.label}</span>
                    {reminder.dueDate && <div className="flex items-center gap-1 text-xs"><Calendar className="w-3 h-3 text-neutral-400" /><span>{formatDate(reminder.dueDate)}</span></div>}
                    {reminder.dueKm && <div className="flex items-center gap-1 text-xs"><Gauge className="w-3 h-3 text-neutral-400" /><span>{reminder.dueKm.toLocaleString('es-AR')} km</span></div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {reminder.isOverdue ? (
                      <span className="text-xs font-medium text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Vencido</span>
                    ) : (
                      <>
                        {reminder.daysRemaining !== undefined && <span className={`text-xs ${reminder.isUrgent ? 'text-amber-600 font-medium' : 'text-neutral-500'}`}><Clock className="w-3 h-3 inline mr-1" />{reminder.daysRemaining === 0 ? 'Hoy' : reminder.daysRemaining === 1 ? 'Mañana' : `${reminder.daysRemaining} días`}</span>}
                        {reminder.kmRemaining !== undefined && <span className={`text-xs ${reminder.isUrgent ? 'text-amber-600 font-medium' : 'text-neutral-500'}`}>{reminder.kmRemaining.toLocaleString('es-AR')} km</span>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-neutral-200 rounded p-3">
            <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-3">Datos del Vehículo</h2>
            {editMode ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-neutral-700 mb-1">Dominio</label><Input value={formData.identifier} onChange={(e) => setFormData({ ...formData, identifier: e.target.value.toUpperCase() })} className="h-8 text-sm font-mono uppercase" /></div>
                <div><label className="block text-xs font-medium text-neutral-700 mb-1">Marca</label><select value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="h-8 w-full text-sm border border-neutral-200 rounded px-2"><option value="">-</option>{BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-neutral-700 mb-1">Modelo</label><Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="h-8 text-sm" /></div>
                <div><label className="block text-xs font-medium text-neutral-700 mb-1">Tipo</label><select value={formData.vehicle_type} onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })} className="h-8 w-full text-sm border border-neutral-200 rounded px-2"><option value="">-</option>{VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-neutral-700 mb-1">Año</label><Input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} className="h-8 text-sm" /></div>
                <div><label className="block text-xs font-medium text-neutral-700 mb-1">Km Inicial</label><Input type="number" value={formData.purchase_km} onChange={(e) => setFormData({ ...formData, purchase_km: e.target.value })} className="h-8 text-sm" /></div>
                <div className="col-span-2 sm:col-span-3"><label className="block text-xs font-medium text-neutral-700 mb-1">Notas</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full text-sm border border-neutral-200 rounded px-2 py-1.5 resize-none" /></div>
                <div className="col-span-2 sm:col-span-3 flex items-center gap-2"><input type="checkbox" id="is_active_edit" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded" /><label htmlFor="is_active_edit" className="text-sm">Activo</label></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div><span className="text-neutral-500">Marca:</span><span className="ml-2 font-medium">{vehicle.brand || '-'}</span></div>
                <div><span className="text-neutral-500">Modelo:</span><span className="ml-2 font-medium">{vehicle.model || '-'}</span></div>
                <div><span className="text-neutral-500">Tipo:</span><span className="ml-2">{vehicle.vehicle_type || '-'}</span></div>
                <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-neutral-400" /><span className="text-neutral-500">Año:</span><span className="ml-1 font-medium">{vehicle.year || '-'}</span></div>
                <div className="flex items-center gap-1"><Gauge className="w-3 h-3 text-neutral-400" /><span className="text-neutral-500">Km Inicial:</span><span className="ml-1">{vehicle.purchase_km?.toLocaleString('es-AR') || '-'}</span></div>
                {vehicle.notes && <div className="col-span-2 sm:col-span-3 text-neutral-500 text-xs mt-2">{vehicle.notes}</div>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-neutral-200 rounded p-3">
              <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-2">Patentes</h2>
              {editMode ? (
                <div className="space-y-2">
                  <div><label className="block text-xs text-neutral-600 mb-1">Principal</label><Input value={formData.tractor_license_plate} onChange={(e) => setFormData({ ...formData, tractor_license_plate: e.target.value.toUpperCase() })} className="h-8 text-sm font-mono uppercase" /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Acoplado</label><Input value={formData.trailer_license_plate} onChange={(e) => setFormData({ ...formData, trailer_license_plate: e.target.value.toUpperCase() })} className="h-8 text-sm font-mono uppercase" /></div>
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  <div><span className="text-neutral-500">Principal:</span><span className="ml-2 font-mono">{vehicle.tractor_license_plate || '-'}</span></div>
                  <div><span className="text-neutral-500">Acoplado:</span><span className="ml-2 font-mono">{vehicle.trailer_license_plate || '-'}</span></div>
                </div>
              )}
            </div>
            <div className="border border-neutral-200 rounded p-3">
              <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-2">Capacidad</h2>
              {editMode ? (
                <div className="space-y-2">
                  <div><label className="block text-xs text-neutral-600 mb-1">Pallets</label><Input type="number" value={formData.pallet_capacity} onChange={(e) => setFormData({ ...formData, pallet_capacity: e.target.value })} className="h-8 text-sm" /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Peso Máx (kg)</label><Input type="number" value={formData.weight_capacity_kg} onChange={(e) => setFormData({ ...formData, weight_capacity_kg: e.target.value })} className="h-8 text-sm" /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Volumen (m³)</label><Input type="number" step="0.1" value={formData.capacity_m3} onChange={(e) => setFormData({ ...formData, capacity_m3: e.target.value })} className="h-8 text-sm" /></div>
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  <div><span className="text-neutral-500">Pallets:</span><span className="ml-2 font-medium">{vehicle.pallet_capacity || '-'}</span></div>
                  <div><span className="text-neutral-500">Peso Máx:</span><span className="ml-2 font-medium">{(vehicle.weight_capacity_kg || vehicle.max_weight_kg) ? `${Number(vehicle.weight_capacity_kg || vehicle.max_weight_kg).toLocaleString('es-AR')} kg` : '-'}</span></div>
                  <div><span className="text-neutral-500">Volumen:</span><span className="ml-2 font-medium">{vehicle.capacity_m3 ? `${Number(vehicle.capacity_m3).toLocaleString('es-AR')} m³` : '-'}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Equipamiento */}
          <div className="border border-neutral-200 rounded p-3">
            <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-2">Equipamiento</h2>
            {editMode ? (
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.has_forklift} onChange={(e) => setFormData({ ...formData, has_forklift: e.target.checked })} className="rounded border-neutral-300" />
                  <span className="text-sm">Autoelevador</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.has_hydraulic_ramp} onChange={(e) => setFormData({ ...formData, has_hydraulic_ramp: e.target.checked })} className="rounded border-neutral-300" />
                  <span className="text-sm">Pala Hidráulica</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.has_thermal_control} onChange={(e) => setFormData({ ...formData, has_thermal_control: e.target.checked })} className="rounded border-neutral-300" />
                  <span className="text-sm">Control Térmico</span>
                </label>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vehicle.has_forklift && <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">Autoelevador</span>}
                {vehicle.has_hydraulic_ramp && <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Pala Hidráulica</span>}
                {vehicle.has_thermal_control && <span className="text-xs px-2 py-1 bg-cyan-50 text-cyan-700 rounded">Control Térmico</span>}
                {!vehicle.has_forklift && !vehicle.has_hydraulic_ramp && !vehicle.has_thermal_control && (
                  <span className="text-xs text-neutral-400">Sin equipamiento especial</span>
                )}
              </div>
            )}
          </div>

          {/* Imagen del Vehículo */}
          <div className="border border-neutral-200 rounded p-3">
            <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-2">Imagen del Vehículo</h2>
            <div className="flex items-start gap-4">
              {imageUrl ? (
                <div className="relative w-32 h-24 bg-neutral-100 rounded overflow-hidden">
                  <img src={imageUrl} alt={vehicle.identifier} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-32 h-24 bg-neutral-100 rounded flex items-center justify-center">
                  <Image className="w-8 h-8 text-neutral-300" />
                </div>
              )}
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 h-8 px-3 text-sm border border-neutral-200 hover:bg-neutral-50 rounded">
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? 'Subiendo...' : 'Subir Imagen'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
                <p className="text-xs text-neutral-400 mt-2">JPG, PNG hasta 5MB</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="border border-neutral-200 rounded">
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100 bg-neutral-50">
              <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium">Historial</h2>
              <Button onClick={() => setShowEventForm(!showEventForm)} variant="ghost" size="sm" className="h-6 px-2 text-xs">{showEventForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}</Button>
            </div>
            
            {showEventForm && (
              <form onSubmit={handleAddEvent} className="p-3 border-b border-neutral-100 bg-neutral-50/50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs text-neutral-600 mb-1">Tipo</label><select value={newEvent.event_type} onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })} className="h-7 w-full text-xs border border-neutral-200 rounded px-2">{EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Fecha</label><Input type="date" value={newEvent.event_date} onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })} className="h-7 text-xs" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs text-neutral-600 mb-1">Km</label><Input type="number" value={newEvent.km_at_event} onChange={(e) => setNewEvent({ ...newEvent, km_at_event: e.target.value })} placeholder={currentKm.toString()} className="h-7 text-xs" /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Costo $</label><Input type="number" value={newEvent.cost} onChange={(e) => setNewEvent({ ...newEvent, cost: e.target.value })} className="h-7 text-xs" /></div>
                </div>
                <div><label className="block text-xs text-neutral-600 mb-1">Proveedor</label><Input value={newEvent.provider} onChange={(e) => setNewEvent({ ...newEvent, provider: e.target.value })} className="h-7 text-xs" /></div>
                <div><label className="block text-xs text-neutral-600 mb-1">Descripción</label><Input value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} className="h-7 text-xs" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs text-neutral-600 mb-1">Próx. Vto. (fecha)</label><Input type="date" value={newEvent.next_date} onChange={(e) => setNewEvent({ ...newEvent, next_date: e.target.value })} className="h-7 text-xs" /></div>
                  <div><label className="block text-xs text-neutral-600 mb-1">Próx. Vto. (km)</label><Input type="number" value={newEvent.next_km} onChange={(e) => setNewEvent({ ...newEvent, next_km: e.target.value })} className="h-7 text-xs" /></div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white">Agregar Evento</Button>
              </form>
            )}

            <div className="max-h-[500px] overflow-y-auto">
              {events.length === 0 ? (
                <div className="px-3 py-6 text-center text-neutral-400 text-xs">Sin eventos</div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {events.map((event) => {
                    const config = getEventConfig(event.event_type);
                    const Icon = config.icon;
                    return (
                      <div key={event.id} className="px-3 py-2 hover:bg-neutral-50 group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <div className={`p-1 rounded ${config.color}`}><Icon className="w-3 h-3" /></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}>{config.label}</span>
                                <span className="text-xs text-neutral-400">{formatDate(event.event_date)}</span>
                              </div>
                              {event.description && <p className="text-xs text-neutral-600 mt-0.5">{event.description}</p>}
                              <div className="flex flex-wrap gap-2 mt-1 text-xs text-neutral-400">
                                {event.km_at_event && <span>{event.km_at_event.toLocaleString('es-AR')} km</span>}
                                {event.cost && <span>${event.cost.toLocaleString('es-AR')}</span>}
                                {event.provider && <span>{event.provider}</span>}
                              </div>
                              {(event.next_date || event.next_km) && (
                                <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                  <Bell className="w-3 h-3" />Próximo: {event.next_date && formatDate(event.next_date)}{event.next_km && ` / ${event.next_km.toLocaleString('es-AR')} km`}
                                </div>
                              )}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

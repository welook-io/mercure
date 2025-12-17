import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { Truck, Calendar, Gauge, Bell, AlertTriangle } from "lucide-react";

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
  purchase_km: number | null;
  is_active: boolean;
  notes: string | null;
}

interface VehicleEvent {
  id: number;
  vehicle_id: number;
  event_type: string;
  event_date: string;
  km_at_event: number | null;
  next_date: string | null;
  next_km: number | null;
}

async function getVehicles(): Promise<Vehicle[]> {
  const { data } = await supabase
    .schema('mercure')
    .from('vehicles')
    .select('*')
    .order('identifier', { ascending: true });
  return (data as Vehicle[]) || [];
}

async function getVehicleEvents(): Promise<VehicleEvent[]> {
  const { data } = await supabase
    .schema('mercure')
    .from('vehicle_events')
    .select('id, vehicle_id, event_type, event_date, km_at_event, next_date, next_km')
    .order('event_date', { ascending: false });
  return (data as VehicleEvent[]) || [];
}

function calculateCurrentKm(events: VehicleEvent[], vehicleId: number, purchaseKm: number | null): number {
  const vehicleEvents = events.filter(e => e.vehicle_id === vehicleId && e.km_at_event !== null);
  if (vehicleEvents.length === 0) return purchaseKm || 0;
  return vehicleEvents[0].km_at_event || 0;
}

interface ReminderInfo {
  overdueCount: number;
  urgentCount: number;
}

function calculateReminders(events: VehicleEvent[], vehicleId: number, currentKm: number): ReminderInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const vehicleEvents = events.filter(e => e.vehicle_id === vehicleId && (e.next_date || e.next_km));
  let overdueCount = 0;
  let urgentCount = 0;

  vehicleEvents.forEach(event => {
    if (event.next_date) {
      const dueDate = new Date(event.next_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) overdueCount++;
      else if (diffDays <= 15) urgentCount++;
    }
    
    if (event.next_km && currentKm) {
      const kmRemaining = event.next_km - currentKm;
      if (kmRemaining <= 0) overdueCount++;
      else if (kmRemaining <= 1000) urgentCount++;
    }
  });

  return { overdueCount, urgentCount };
}

export default async function VehiculosPage() {
  await requireAuth("/vehiculos");

  const [vehicles, events] = await Promise.all([
    getVehicles(),
    getVehicleEvents()
  ]);

  // Calcular datos derivados para cada vehículo
  const vehicleData = vehicles.map(v => {
    const currentKm = calculateCurrentKm(events, v.id, v.purchase_km);
    const reminders = calculateReminders(events, v.id, currentKm);
    const eventCount = events.filter(e => e.vehicle_id === v.id).length;
    return { ...v, currentKm, reminders, eventCount };
  });

  const totalOverdue = vehicleData.reduce((sum, v) => sum + v.reminders.overdueCount, 0);
  const totalUrgent = vehicleData.reduce((sum, v) => sum + v.reminders.urgentCount, 0);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-neutral-400" />
              <h1 className="text-lg font-medium text-neutral-900">Vehículos</h1>
              <Badge variant="default" className="ml-2">{vehicles.length}</Badge>
              {totalOverdue > 0 && (
                <Badge variant="error" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {totalOverdue} vencidos
                </Badge>
              )}
              {totalUrgent > 0 && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  {totalUrgent} próximos
                </Badge>
              )}
            </div>
            <Link href="/vehiculos/nuevo">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto">
                + Nuevo Vehículo
              </Button>
            </Link>
          </div>

          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Dominio</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Marca</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Modelo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Año</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Km Actual</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Alertas</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleData.length === 0 ? (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-neutral-400">Sin vehículos</td></tr>
                  ) : (
                    vehicleData.map((v) => (
                      <tr key={v.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="px-3 py-2">
                          <Link href={`/vehiculos/${v.id}`} className="font-mono font-medium text-orange-600 hover:text-orange-700">
                            {v.identifier}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-neutral-700">{v.brand || '-'}</td>
                        <td className="px-3 py-2 text-neutral-600">{v.model || '-'}</td>
                        <td className="px-3 py-2">
                          {v.vehicle_type ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                              {v.vehicle_type}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 text-neutral-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-neutral-400" />
                            {v.year || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-neutral-600">
                          <div className="flex items-center gap-1">
                            <Gauge className="w-3 h-3 text-neutral-400" />
                            {v.currentKm > 0 ? v.currentKm.toLocaleString('es-AR') : '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {v.reminders.overdueCount > 0 ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              {v.reminders.overdueCount}
                            </span>
                          ) : v.reminders.urgentCount > 0 ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 flex items-center gap-1 w-fit">
                              <Bell className="w-3 h-3" />
                              {v.reminders.urgentCount}
                            </span>
                          ) : (
                            <span className="text-neutral-300">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={v.is_active ? 'success' : 'error'}>
                            {v.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Link href={`/vehiculos/${v.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              Ver
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import VehicleDetailClient from "./client";

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

async function getVehicle(id: string): Promise<Vehicle | null> {
  const { data } = await supabase
    .schema('mercure').from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
  return data as Vehicle | null;
}

async function getVehicleEvents(vehicleId: string): Promise<VehicleEvent[]> {
  const { data } = await supabase
    .schema('mercure').from('vehicle_events')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('event_date', { ascending: false });
  return (data as VehicleEvent[]) || [];
}

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth("/vehiculos");
  
  const { id } = await params;
  const [vehicle, events] = await Promise.all([
    getVehicle(id),
    getVehicleEvents(id)
  ]);

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <VehicleDetailClient vehicle={vehicle} initialEvents={events} />
      </main>
    </div>
  );
}

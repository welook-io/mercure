import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { TripsListClient } from "./trips-list-client";

async function getTripsWithShipments() {
  // Obtener trips
  const { data: trips, error } = await supabaseAdmin!
    .schema('mercure')
    .from('trips')
    .select('id, origin, destination, status, trip_type, departure_time, vehicle_id, agreed_price, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('Error fetching trips:', error);
    return [];
  }
  
  if (!trips || trips.length === 0) return [];
  
  const tripIds = trips.map(t => t.id);
  
  // Obtener vehículos
  const vehicleIds = trips.map(t => t.vehicle_id).filter(Boolean);
  let vehiclesMap: Record<number, { identifier: string; tractor_license_plate: string | null }> = {};
  
  if (vehicleIds.length > 0) {
    const { data: vehicles } = await supabaseAdmin!
      .schema('mercure')
      .from('vehicles')
      .select('id, identifier, tractor_license_plate')
      .in('id', vehicleIds);
    
    if (vehicles) {
      vehiclesMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
    }
  }
  
  // Obtener shipments para cada trip
  const { data: shipments } = await supabaseAdmin!
    .schema('mercure')
    .from('shipments')
    .select('id, trip_id, delivery_note_number, weight_kg, volume_m3, cargo_image_url, remito_image_url')
    .in('trip_id', tripIds);
  
  // Agrupar shipments por trip
  const shipmentsMap: Record<number, Array<{
    id: number;
    delivery_note_number: string;
    weight_kg: number | null;
    volume_m3: number | null;
    cargo_image_url: string | null;
    remito_image_url: string | null;
  }>> = {};
  
  (shipments || []).forEach(s => {
    if (!shipmentsMap[s.trip_id]) {
      shipmentsMap[s.trip_id] = [];
    }
    shipmentsMap[s.trip_id].push({
      id: s.id,
      delivery_note_number: s.delivery_note_number,
      weight_kg: s.weight_kg,
      volume_m3: s.volume_m3,
      cargo_image_url: s.cargo_image_url,
      remito_image_url: s.remito_image_url,
    });
  });
  
  // Combinar todo
  return trips.map(t => {
    const tripShipments = shipmentsMap[t.id] || [];
    const totalWeight = tripShipments.reduce((sum, s) => sum + (s.weight_kg || 0), 0);
    const totalVolume = tripShipments.reduce((sum, s) => sum + (s.volume_m3 || 0), 0);
    
    return {
      id: t.id,
      origin: t.origin,
      destination: t.destination,
      status: t.status,
      trip_type: t.trip_type || 'consolidado',
      departure_time: t.departure_time,
      agreed_price: t.agreed_price,
      created_at: t.created_at,
      vehicle: t.vehicle_id ? vehiclesMap[t.vehicle_id] || null : null,
      shipments: tripShipments,
      total_weight: totalWeight,
      total_volume: totalVolume,
      shipment_count: tripShipments.length,
    };
  });
}

export default async function ViajesPage() {
  await requireAuth("/viajes");

  const trips = await getTripsWithShipments();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <h1 className="text-lg font-medium text-neutral-900">Viajes</h1>
            <Link href="/viajes/nuevo">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto">
                Nuevo Viaje
              </Button>
            </Link>
          </div>

          <TripsListClient trips={trips} />
        </div>
      </main>
    </div>
  );
}

import { Navbar } from "@/components/layout/navbar";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { TripDetailClient } from "./trip-detail-client";

async function getTrip(id: number) {
  // Obtener trip sin joins primero para evitar problemas de schema cache
  const { data: trip, error } = await supabaseAdmin!
    .schema('mercure').from('trips')
    .select('id, origin, destination, status, departure_time, arrival_time, notes, vehicle_id, driver_name, driver_dni, driver_phone, trip_type, created_at')
    .eq('id', id)
    .single();
  
  if (error || !trip) {
    console.error('Error fetching trip:', error);
    return null;
  }
  
  // Si tiene vehículo, obtenerlo por separado
  let vehicle = null;
  if (trip.vehicle_id) {
    const { data: vehicleData } = await supabaseAdmin!
      .schema('mercure').from('vehicles')
      .select('identifier, tractor_license_plate')
      .eq('id', trip.vehicle_id)
      .single();
    vehicle = vehicleData;
  }
  
  return {
    ...trip,
    vehicle,
    driver_name: trip.driver_name || null,
    driver_dni: trip.driver_dni || null,
    driver_phone: trip.driver_phone || null,
  };
}

async function getTripShipments(tripId: number, tripType: string) {
  // Para ultima_milla buscar por last_mile_trip_id, sino por trip_id
  const isUltimaMilla = tripType === 'ultima_milla';
  
  let query = supabaseAdmin!
    .schema('mercure').from('shipments')
    .select('id, delivery_note_number, sender_id, recipient_id, weight_kg, volume_m3, declared_value, status, created_at');
  
  if (isUltimaMilla) {
    query = query.eq('last_mile_trip_id', tripId);
  } else {
    query = query.eq('trip_id', tripId);
  }
  
  const { data: shipments, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching trip shipments:', error);
    return [];
  }
  
  if (!shipments || shipments.length === 0) {
    return [];
  }
  
  // Obtener entidades por separado
  const senderIds = [...new Set(shipments.map(s => s.sender_id).filter(Boolean))];
  const recipientIds = [...new Set(shipments.map(s => s.recipient_id).filter(Boolean))];
  const allIds = [...new Set([...senderIds, ...recipientIds])];
  
  let entitiesMap: Record<number, { id: number; legal_name: string }> = {};
  if (allIds.length > 0) {
    const { data: entities } = await supabaseAdmin!
      .schema('mercure')
      .from('entities')
      .select('id, legal_name')
      .in('id', allIds);
    
    if (entities) {
      entitiesMap = Object.fromEntries(entities.map(e => [e.id, e]));
    }
  }
  
  // Agregar sender y recipient a cada shipment
  return shipments.map(s => ({
    ...s,
    sender: s.sender_id ? entitiesMap[s.sender_id] || null : null,
    recipient: s.recipient_id ? entitiesMap[s.recipient_id] || null : null,
  }));
}

async function getEntities() {
  const { data } = await supabaseAdmin!
    .schema('mercure').from('entities')
    .select('id, legal_name, tax_id')
    .order('legal_name');
  return data || [];
}

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth("/viajes");
  const { id } = await params;
  const tripId = parseInt(id);
  
  // Primero obtener el trip para saber su tipo
  const [trip, entities] = await Promise.all([
    getTrip(tripId),
    getEntities(),
  ]);

  if (!trip) {
    notFound();
  }

  // Luego obtener shipments basándose en el tipo de viaje
  const shipments = await getTripShipments(tripId, trip.trip_type);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <TripDetailClient trip={trip} shipments={shipments} entities={entities} />
      </main>
    </div>
  );
}



import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { HojaRutaClient } from "./hoja-ruta-client";

async function getHojaRutaData(tripId: number) {
  // Obtener el viaje sin joins para evitar problemas de schema cache
  const { data: trip, error: tripError } = await supabaseAdmin!
    .schema("mercure")
    .from("trips")
    .select("id, origin, destination, status, departure_time, notes, vehicle_id, driver_name, driver_dni, driver_phone, created_at")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) {
    console.error("Error fetching trip for hoja de ruta:", tripError);
    return null;
  }

  // Obtener vehículo por separado si existe
  let vehicle = null;
  if (trip.vehicle_id) {
    const { data: vehicleData } = await supabaseAdmin!
      .schema("mercure")
      .from("vehicles")
      .select("id, identifier, tractor_license_plate, brand, model")
      .eq("id", trip.vehicle_id)
      .single();
    vehicle = vehicleData;
  }

  // Obtener shipments sin joins para evitar problemas de schema cache
  const { data: shipments, error: shipmentsError } = await supabaseAdmin!
    .schema("mercure")
    .from("shipments")
    .select("id, delivery_note_number, package_quantity, weight_kg, declared_value, paid_by, sender_id, recipient_id")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (shipmentsError) {
    console.error("Error fetching shipments for hoja de ruta:", shipmentsError);
  }

  // Obtener entidades para shipments
  const senderIds = [...new Set((shipments || []).map(s => s.sender_id).filter(Boolean))];
  const recipientIds = [...new Set((shipments || []).map(s => s.recipient_id).filter(Boolean))];
  const allEntityIds = [...new Set([...senderIds, ...recipientIds])];

  let entitiesMap: Record<number, { id: number; legal_name: string; address?: string }> = {};
  if (allEntityIds.length > 0) {
    const { data: entities } = await supabaseAdmin!
      .schema("mercure")
      .from("entities")
      .select("id, legal_name, address")
      .in("id", allEntityIds);
    
    if (entities) {
      entitiesMap = Object.fromEntries(entities.map(e => [e.id, e]));
    }
  }

  // Agregar entidades a shipments
  const shipmentsWithEntities = (shipments || []).map(s => ({
    ...s,
    sender: s.sender_id ? entitiesMap[s.sender_id] || null : null,
    recipient: s.recipient_id ? entitiesMap[s.recipient_id] || null : null,
  }));

  // Formatear datos para el documento
  const remitos = shipmentsWithEntities.map((s: any) => {
    const sender = Array.isArray(s.sender) ? s.sender[0] : s.sender;
    const recipient = Array.isArray(s.recipient) ? s.recipient[0] : s.recipient;
    return {
      id: s.id,
      delivery_note_number: s.delivery_note_number || `#${s.id}`,
      sender_name: sender?.legal_name || "Sin remitente",
      recipient_name: recipient?.legal_name || "Sin destinatario",
      recipient_address: recipient?.address || "",
      package_quantity: s.package_quantity || 0,
      weight_kg: s.weight_kg || 0,
      declared_value: s.declared_value || 0,
      paid_by: s.paid_by || "destino",
    };
  });

  return {
    id: trip.id,
    guia_number: `HR${String(trip.id).padStart(6, "0")}`,
    trip_date: trip.departure_time || trip.created_at,
    origin: trip.origin,
    destination: trip.destination,
    vehicle: vehicle
      ? {
          plate: vehicle.tractor_license_plate || vehicle.identifier,
          description: vehicle.brand
            ? `${vehicle.brand} ${vehicle.model || ""}`.trim()
            : vehicle.identifier,
        }
      : null,
    driver: trip.driver_name
      ? {
          name: trip.driver_name,
          dni: trip.driver_dni || undefined,
          phone: trip.driver_phone || undefined,
        }
      : null,
    remitos,
    notes: trip.notes,
  };
}

export default async function HojaRutaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth("/viajes");
  const { id } = await params;
  const tripId = parseInt(id);
  
  const hojaRuta = await getHojaRutaData(tripId);

  if (!hojaRuta) {
    notFound();
  }

  return <HojaRutaClient hojaRuta={hojaRuta} tripId={tripId} />;
}


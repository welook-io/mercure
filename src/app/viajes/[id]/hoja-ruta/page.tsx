import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { HojaRutaClient } from "./hoja-ruta-client";

async function getHojaRutaData(tripId: number) {
  // Obtener el viaje
  const { data: trip, error: tripError } = await supabaseAdmin!
    .schema("mercure")
    .from("trips")
    .select(`
      *,
      vehicle:vehicles(id, identifier, tractor_license_plate, brand, model)
    `)
    .eq("id", tripId)
    .single();

  if (tripError || !trip) {
    return null;
  }

  // Obtener shipments y guías del viaje
  const [shipmentsRes, guidesRes] = await Promise.all([
    supabaseAdmin!
      .schema("mercure")
      .from("shipments")
      .select(`
        id,
        delivery_note_number,
        package_quantity,
        weight_kg,
        declared_value,
        paid_by,
        sender:entities!shipments_sender_id_fkey(id, legal_name, address),
        recipient:entities!shipments_recipient_id_fkey(id, legal_name, address)
      `)
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }),
    supabaseAdmin!
      .schema("mercure")
      .from("trip_guides")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }),
  ]);
  
  const shipments = shipmentsRes.data;
  const guides = guidesRes.data || [];

  // Formatear datos para el documento
  const remitos = (shipments || []).map((s: any) => {
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
    vehicle: trip.vehicle
      ? {
          plate: trip.vehicle.tractor_license_plate || trip.vehicle.identifier,
          description: trip.vehicle.brand
            ? `${trip.vehicle.brand} ${trip.vehicle.model || ""}`.trim()
            : trip.vehicle.identifier,
        }
      : null,
    driver: trip.driver_name
      ? {
          name: trip.driver_name,
          dni: trip.driver_dni || undefined,
          phone: trip.driver_phone || undefined,
        }
      : null,
    guides: guides.map((g: any) => ({
      name: g.guide_name,
      dni: g.guide_dni,
      phone: g.guide_phone,
      role: g.role,
    })),
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


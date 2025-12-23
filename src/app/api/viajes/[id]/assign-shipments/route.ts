import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: Obtener shipments disponibles para asignar
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Obtener el viaje para saber tipo (viaje normal o última milla)
    const { data: trip } = await supabaseAdmin!
      .schema("mercure")
      .from("trips")
      .select("origin, destination, trip_type")
      .eq("id", parseInt(id))
      .single();

    if (!trip) {
      return NextResponse.json({ error: "Viaje no encontrado" }, { status: 404 });
    }

    const isUltimaMilla = trip.trip_type === 'ultima_milla';

    // Obtener shipments según tipo de viaje
    let query = supabaseAdmin!
      .schema("mercure")
      .from("shipments")
      .select("id, delivery_note_number, sender_id, recipient_id, weight_kg, volume_m3, declared_value, status, created_at, trip_id");

    if (isUltimaMilla) {
      // Última Milla: guías que llegaron a destino (en_destino, arrived, loaded)
      // y no tienen un viaje de última milla asignado
      query = query.in("status", ["en_destino", "arrived", "loaded"]);
    } else {
      // Viaje normal: guías en recepción sin viaje asignado
      query = query
        .is("trip_id", null)
        .in("status", ["received", "in_warehouse", "ingresada", "pendiente"]);
    }

    const { data: shipments, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching available shipments:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Obtener nombres de entidades
    const senderIds = [...new Set(shipments?.map(s => s.sender_id).filter(Boolean) || [])];
    const recipientIds = [...new Set(shipments?.map(s => s.recipient_id).filter(Boolean) || [])];
    const allIds = [...new Set([...senderIds, ...recipientIds])];

    let entitiesMap: Record<number, string> = {};
    if (allIds.length > 0) {
      const { data: entities } = await supabaseAdmin!
        .schema("mercure")
        .from("entities")
        .select("id, legal_name")
        .in("id", allIds);
      
      if (entities) {
        entitiesMap = Object.fromEntries(entities.map(e => [e.id, e.legal_name]));
      }
    }

    // Agregar nombres a shipments
    const shipmentsWithNames = (shipments || []).map(s => ({
      ...s,
      sender_name: s.sender_id ? entitiesMap[s.sender_id] || null : null,
      recipient_name: s.recipient_id ? entitiesMap[s.recipient_id] || null : null,
    }));

    return NextResponse.json({ shipments: shipmentsWithNames });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST: Asignar shipments a un viaje
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);
    const { shipmentIds } = await request.json();

    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return NextResponse.json({ error: "Debe seleccionar al menos una guía" }, { status: 400 });
    }

    // Verificar que el viaje existe y obtener tipo
    const { data: trip } = await supabaseAdmin!
      .schema("mercure")
      .from("trips")
      .select("id, status, trip_type")
      .eq("id", tripId)
      .single();

    if (!trip) {
      return NextResponse.json({ error: "Viaje no encontrado" }, { status: 404 });
    }

    if (!["planned", "loading"].includes(trip.status)) {
      return NextResponse.json({ error: "El viaje ya fue despachado" }, { status: 400 });
    }

    const isUltimaMilla = trip.trip_type === 'ultima_milla';

    // Asignar shipments al viaje
    // Para última milla, guardamos el trip_id en un campo diferente (last_mile_trip_id)
    // o podemos usar el mismo trip_id pero con status diferente
    const updateData = isUltimaMilla 
      ? { last_mile_trip_id: tripId } // Guarda referencia a última milla sin cambiar trip_id original
      : { trip_id: tripId, status: "loaded" };

    let query = supabaseAdmin!
      .schema("mercure")
      .from("shipments")
      .update(updateData)
      .in("id", shipmentIds);

    if (!isUltimaMilla) {
      query = query.is("trip_id", null); // Solo para viajes normales
    }

    const { error } = await query;

    if (error) {
      console.error("Error assigning shipments:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      assigned: shipmentIds.length 
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE: Quitar un shipment del viaje
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get("shipmentId");

    if (!shipmentId) {
      return NextResponse.json({ error: "shipmentId requerido" }, { status: 400 });
    }

    // Quitar del viaje
    const { error } = await supabaseAdmin!
      .schema("mercure")
      .from("shipments")
      .update({ 
        trip_id: null,
        status: "in_warehouse" // Vuelve a depósito
      })
      .eq("id", parseInt(shipmentId))
      .eq("trip_id", tripId);

    if (error) {
      console.error("Error removing shipment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}


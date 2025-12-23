import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: Listar viajes o un viaje específico
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // Obtener viaje específico con shipments
      const { data: trip, error } = await supabaseAdmin!
        .schema("mercure")
        .from("trips")
        .select(`
          *, 
          vehicle:vehicles(id, identifier, tractor_license_plate)
        `)
        .eq("id", parseInt(id))
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      // Obtener shipments del viaje
      const { data: shipments } = await supabaseAdmin!
        .schema("mercure")
        .from("shipments")
        .select(`
          *,
          sender:entities!shipments_sender_id_fkey(id, legal_name),
          recipient:entities!shipments_recipient_id_fkey(id, legal_name)
        `)
        .eq("trip_id", parseInt(id))
        .order("created_at", { ascending: false });

      return NextResponse.json({ trip, shipments: shipments || [] });
    }

    // Listar todos los viajes
    const { data: trips, error } = await supabaseAdmin!
      .schema("mercure")
      .from("trips")
      .select(`
        *, 
        vehicle:vehicles(identifier, tractor_license_plate),
        client:entities!trips_client_id_fkey(legal_name),
        supplier:entities!trips_supplier_id_fkey(legal_name)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trips: trips || [] });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      { error: "Error al obtener viajes" },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo viaje
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Si es tercerizado, no asignar vehículo propio
    const isTercerizado = body.vehicle_id === 'tercerizado_logisa';
    
    const tripData: Record<string, unknown> = {
      trip_type: body.trip_type || "consolidado",
      origin: body.origin,
      destination: body.destination,
      status: "planned",
      vehicle_id: isTercerizado ? null : (body.vehicle_id ? parseInt(body.vehicle_id) : null),
      departure_time: body.departure_time || null,
      notes: isTercerizado 
        ? `[Tercerizado Logisa] ${body.notes || ''}`.trim()
        : (body.notes || null),
      // Campos para conductor/guía
      driver_name: body.driver_name || null,
      driver_dni: body.driver_dni || null,
      driver_phone: body.driver_phone || null,
    };

    // Campos adicionales para camión completo
    if (body.trip_type === "camion_completo") {
      tripData.client_id = body.client_id ? parseInt(body.client_id) : null;
      tripData.supplier_id = body.supplier_id
        ? parseInt(body.supplier_id)
        : null;
      tripData.agreed_price = body.agreed_price
        ? parseFloat(body.agreed_price)
        : null;
      tripData.pickup_address = body.pickup_address || null;
      tripData.delivery_address = body.delivery_address || null;
      tripData.cargo_description = body.cargo_description || null;
      tripData.weight_kg = body.weight_kg ? parseFloat(body.weight_kg) : null;
      tripData.volume_m3 = body.volume_m3 ? parseFloat(body.volume_m3) : null;
    }

    const { data: newTrip, error } = await supabaseAdmin!
      .schema("mercure")
      .from("trips")
      .insert(tripData)
      .select()
      .single();

    if (error) {
      console.error("Error creating trip:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trip: newTrip });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "Error al crear viaje" },
      { status: 500 }
    );
  }
}

// PUT: Actualizar viaje
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID del viaje es requerido" },
        { status: 400 }
      );
    }

    const { data: updatedTrip, error } = await supabaseAdmin!
      .schema("mercure")
      .from("trips")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trip: updatedTrip });
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { error: "Error al actualizar viaje" },
      { status: 500 }
    );
  }
}




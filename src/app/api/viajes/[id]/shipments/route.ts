import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST: Agregar shipment a un viaje
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);
    const body = await request.json();

    if (!body.delivery_note_number) {
      return NextResponse.json(
        { error: "Nº de remito es requerido" },
        { status: 400 }
      );
    }

    if (!body.sender_id) {
      return NextResponse.json(
        { error: "Remitente es requerido" },
        { status: 400 }
      );
    }

    const { data: newShipment, error } = await supabaseAdmin!
      .schema("mercure")
      .from("shipments")
      .insert({
        delivery_note_number: body.delivery_note_number,
        sender_id: body.sender_id,
        recipient_id: body.recipient_id || null,
        weight_kg: body.weight_kg || null,
        volume_m3: body.volume_m3 || null,
        declared_value: body.declared_value || null,
        freight_cost: body.freight_cost || null,
        insurance_cost: body.insurance_cost || null,
        origin: body.origin || null,
        destination: body.destination || null,
        trip_id: tripId,
        status: body.status || "rendida",
      })
      .select(`
        *,
        sender:entities!shipments_sender_id_fkey(id, legal_name),
        recipient:entities!shipments_recipient_id_fkey(id, legal_name)
      `)
      .single();

    if (error) {
      console.error("Error creating shipment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ shipment: newShipment });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json(
      { error: "Error al crear remito" },
      { status: 500 }
    );
  }
}











import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: Obtener guías de un viaje
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);

    const { data: guides, error } = await supabaseAdmin!
      .schema("mercure")
      .from("trip_guides")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ guides: guides || [] });
  } catch (error) {
    console.error("Error fetching guides:", error);
    return NextResponse.json(
      { error: "Error al obtener guías" },
      { status: 500 }
    );
  }
}

// POST: Agregar guía a un viaje
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = parseInt(id);
    const body = await request.json();

    if (!body.guide_name) {
      return NextResponse.json(
        { error: "Nombre del guía es requerido" },
        { status: 400 }
      );
    }

    const { data: newGuide, error } = await supabaseAdmin!
      .schema("mercure")
      .from("trip_guides")
      .insert({
        trip_id: tripId,
        guide_name: body.guide_name,
        guide_dni: body.guide_dni || null,
        guide_phone: body.guide_phone || null,
        role: body.role || "acompanante",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating guide:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ guide: newGuide });
  } catch (error) {
    console.error("Error creating guide:", error);
    return NextResponse.json(
      { error: "Error al agregar guía" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar guía de un viaje
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const guideId = searchParams.get("guideId");

    if (!guideId) {
      return NextResponse.json(
        { error: "guideId es requerido" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin!
      .schema("mercure")
      .from("trip_guides")
      .delete()
      .eq("id", parseInt(guideId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting guide:", error);
    return NextResponse.json(
      { error: "Error al eliminar guía" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: Obtener datos necesarios para crear/editar viajes (entidades, vehículos, choferes)
export async function GET() {
  try {
    const [entitiesRes, vehiclesRes, driversRes] = await Promise.all([
      // Entidades
      supabaseAdmin!
        .schema("mercure")
        .from("entities")
        .select("id, legal_name, tax_id")
        .order("legal_name"),
      
      // Vehículos
      supabaseAdmin!
        .schema("mercure")
        .from("vehicles")
        .select("id, identifier, tractor_license_plate, brand, model, image_url")
        .order("identifier"),
      
      // Usuarios con rol chofer
      supabaseAdmin!
        .schema("mercure")
        .from("user_roles")
        .select(`
          id,
          role,
          user:users(id, email, full_name)
        `)
        .eq("role", "chofer")
        .eq("is_active", true),
    ]);

    // Formatear choferes
    const drivers = (driversRes.data || [])
      .map((d: any) => ({
        id: d.user?.id,
        name: d.user?.full_name || d.user?.email || "Sin nombre",
        email: d.user?.email,
      }))
      .filter((d: any) => d.id);

    return NextResponse.json({
      entities: entitiesRes.data || [],
      vehicles: vehiclesRes.data || [],
      drivers,
    });
  } catch (error) {
    console.error("Error fetching trip data:", error);
    return NextResponse.json(
      { error: "Error al obtener datos" },
      { status: 500 }
    );
  }
}




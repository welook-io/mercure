import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST: Subir imagen de vehículo
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const vehicleId = formData.get("vehicleId") as string;

    if (!file || !vehicleId) {
      return NextResponse.json(
        { error: "Archivo y vehicleId son requeridos" },
        { status: 400 }
      );
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `vehicle_${vehicleId}_${Date.now()}.${fileExt}`;
    const filePath = `vehicles/${fileName}`;

    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Subir a Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("mercure-images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("mercure-images").getPublicUrl(filePath);

    // Actualizar en la base de datos
    const { error: updateError } = await supabaseAdmin
      .schema("mercure")
      .from("vehicles")
      .update({ image_url: publicUrl })
      .eq("id", parseInt(vehicleId));

    if (updateError) {
      console.error("Error updating vehicle image:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: "Imagen del vehículo subida correctamente",
    });
  } catch (error) {
    console.error("Error in POST /api/vehiculos/upload-image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}


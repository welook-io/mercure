import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";

interface CreateVehicleRequest {
  identifier: string;
  brand?: string;
  model?: string;
  vehicle_type?: string;
  year?: number;
  tractor_license_plate?: string;
  trailer_license_plate?: string;
  pallet_capacity?: number;
  weight_capacity_kg?: number;
  purchase_date?: string;
  purchase_km?: number;
  purchase_condition?: string;
  is_active?: boolean;
  notes?: string;
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body: CreateVehicleRequest = await request.json();

    if (!body.identifier) {
      return NextResponse.json({ error: 'Identificador/Dominio es requerido' }, { status: 400 });
    }

    // Crear vehículo
    const { data: newVehicle, error: insertError } = await supabaseAdmin
      .schema('mercure')
      .from('vehicles')
      .insert({
        identifier: body.identifier.toUpperCase(),
        brand: body.brand || null,
        model: body.model || null,
        vehicle_type: body.vehicle_type || null,
        year: body.year || null,
        tractor_license_plate: body.tractor_license_plate?.toUpperCase() || body.identifier.toUpperCase(),
        trailer_license_plate: body.trailer_license_plate?.toUpperCase() || null,
        pallet_capacity: body.pallet_capacity || null,
        weight_capacity_kg: body.weight_capacity_kg || null,
        purchase_date: body.purchase_date || null,
        purchase_km: body.purchase_km || null,
        purchase_condition: body.purchase_condition || 'used',
        is_active: body.is_active !== undefined ? body.is_active : true,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating vehicle:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Crear evento de compra
    if (newVehicle) {
      await supabaseAdmin
        .schema('mercure')
        .from('vehicle_events')
        .insert({
          vehicle_id: newVehicle.id,
          event_type: 'compra',
          event_date: body.purchase_date || new Date().toISOString().split('T')[0],
          km_at_event: body.purchase_km || 0,
          description: "Adquisición - " + (body.purchase_condition === 'new' ? '0km' : 'Usado'),
        });
    }

    return NextResponse.json({ 
      success: true, 
      vehicle: newVehicle,
      message: 'Vehículo creado correctamente' 
    });

  } catch (error) {
    console.error('Error in POST /api/vehiculos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}



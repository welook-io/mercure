import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Obtener tarifas (base o tonelaje)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (type === 'tonnage') {
      // Tarifas por tonelaje
      const { data, error } = await supabaseAdmin!
        .schema('mercure')
        .from('tariff_tonnage_rates')
        .select('*')
        .order('origin', { ascending: true })
        .order('tonnage_from_kg', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Tarifas base
    const { data, error } = await supabaseAdmin!
      .schema('mercure')
      .from('tariffs')
      .select('*')
      .order('origin', { ascending: true })
      .order('weight_to_kg', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching tariffs:', error);
    return NextResponse.json({ error: 'Error al obtener tarifas' }, { status: 500 });
  }
}

// POST: Crear nueva tarifa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === 'tonnage') {
      // Crear tarifa por tonelaje
      const { data, error } = await supabaseAdmin!
        .schema('mercure')
        .from('tariff_tonnage_rates')
        .insert({
          origin: body.origin,
          destination: body.destination,
          delivery_type: body.delivery_type || 'deposito',
          tonnage_from_kg: body.tonnage_from_kg,
          tonnage_to_kg: body.tonnage_to_kg,
          price_per_kg: body.price_per_kg,
          includes_iva: body.includes_iva || false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Crear tarifa base
    const { data, error } = await supabaseAdmin!
      .schema('mercure')
      .from('tariffs')
      .insert({
        origin: body.origin,
        destination: body.destination,
        delivery_type: body.delivery_type || 'deposito',
        weight_from_kg: body.weight_from_kg,
        weight_to_kg: body.weight_to_kg,
        price: body.price,
        price_per_kg: body.price_per_kg,
        price_per_m3: body.price_per_m3,
        includes_iva: body.includes_iva || false,
        tariff_type: body.tariff_type || 'standard',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error creating tariff:', error);
    return NextResponse.json({ error: 'Error al crear tarifa' }, { status: 500 });
  }
}

// PUT: Actualizar tarifa
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const table = type === 'tonnage' ? 'tariff_tonnage_rates' : 'tariffs';
    
    const { data, error } = await supabaseAdmin!
      .schema('mercure')
      .from(table)
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating tariff:', error);
    return NextResponse.json({ error: 'Error al actualizar tarifa' }, { status: 500 });
  }
}

// DELETE: Eliminar tarifa
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const table = type === 'tonnage' ? 'tariff_tonnage_rates' : 'tariffs';

    const { error } = await supabaseAdmin!
      .schema('mercure')
      .from(table)
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tariff:', error);
    return NextResponse.json({ error: 'Error al eliminar tarifa' }, { status: 500 });
  }
}










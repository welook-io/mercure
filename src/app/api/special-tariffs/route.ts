import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar tarifas especiales (opcionalmente filtrar por entity_id)
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'No admin client' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get('entity_id');

  let query = supabaseAdmin
    .schema('mercure')
    .from('client_special_tariffs')
    .select(`
      *,
      entity:entities(id, legal_name, tax_id)
    `)
    .order('entity_id', { ascending: true })
    .order('priority', { ascending: false });

  if (entityId) {
    query = query.eq('entity_id', parseInt(entityId));
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching special tariffs:', error);
    return NextResponse.json({ error: 'Error al obtener tarifas especiales' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST - Crear nueva tarifa especial
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'No admin client' }, { status: 500 });
  }

  try {
    const body = await request.json();
    
    const {
      entity_id,
      name,
      description,
      condition_type,
      condition_values,
      pricing_type,
      pricing_values,
      origin,
      destination,
      valid_from,
      valid_until,
      is_active,
      priority,
      notes,
      created_by,
    } = body;

    // Validaciones básicas
    if (!entity_id || !name) {
      return NextResponse.json(
        { error: 'Cliente y nombre son requeridos' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .schema('mercure')
      .from('client_special_tariffs')
      .insert({
        entity_id,
        name,
        description,
        condition_type: condition_type || 'cualquiera',
        condition_values: condition_values || {},
        pricing_type: pricing_type || 'fijo',
        pricing_values: pricing_values || {},
        origin,
        destination,
        valid_from: valid_from || new Date().toISOString().split('T')[0],
        valid_until,
        is_active: is_active !== false,
        priority: priority || 0,
        notes,
        created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating special tariff:', error);
      return NextResponse.json({ error: 'Error al crear tarifa especial' }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PUT - Actualizar tarifa especial
export async function PUT(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'No admin client' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .schema('mercure')
      .from('client_special_tariffs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating special tariff:', error);
      return NextResponse.json({ error: 'Error al actualizar tarifa especial' }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE - Eliminar tarifa especial
export async function DELETE(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'No admin client' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .schema('mercure')
    .from('client_special_tariffs')
    .delete()
    .eq('id', parseInt(id));

  if (error) {
    console.error('Error deleting special tariff:', error);
    return NextResponse.json({ error: 'Error al eliminar tarifa especial' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}


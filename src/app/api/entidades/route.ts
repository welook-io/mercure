import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";

interface CreateEntityRequest {
  legal_name: string;
  tax_id?: string;
  entity_type?: string;
  payment_terms?: string;
  delivery_type?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  // Términos comerciales opcionales
  commercial_terms?: {
    tariff_modifier: number;
    insurance_rate: number;
    credit_days: number;
  };
}

// GET: Obtener lista de entidades
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fields = searchParams.get('fields') || 'id, legal_name, tax_id, entity_type, payment_terms, email, phone, address';
    const withBalances = searchParams.get('withBalances') === 'true';

    let query = supabaseAdmin
      .schema('mercure')
      .from('entities');

    if (withBalances) {
      // Incluir campos de saldo inicial
      const { data, error } = await query
        .select('id, legal_name, tax_id, initial_balance, initial_balance_date, payment_terms')
        .order('legal_name');
      
      if (error) {
        console.error('Error fetching entities:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ entities: data || [] });
    }

    const { data, error } = await query
      .select(fields)
      .order('legal_name');

    if (error) {
      console.error('Error fetching entities:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entities: data || [] });

  } catch (error) {
    console.error('Error in GET /api/entidades:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar entidad(es)
export async function PUT(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();

    // Modo batch: actualizar múltiples saldos iniciales
    if (body.balanceUpdates && Array.isArray(body.balanceUpdates)) {
      const updates = body.balanceUpdates as Array<{
        id: number;
        initial_balance: number;
        initial_balance_date: string | null;
      }>;

      for (const update of updates) {
        const { error } = await supabaseAdmin
          .schema('mercure')
          .from('entities')
          .update({
            initial_balance: update.initial_balance,
            initial_balance_date: update.initial_balance_date,
          })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating entity balance:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `${updates.length} saldos actualizados correctamente` 
      });
    }

    // Modo single: actualizar una entidad
    if (body.id) {
      const { id, commercial_terms, ...entityData } = body;

      const { error: updateError } = await supabaseAdmin
        .schema('mercure')
        .from('entities')
        .update({
          legal_name: entityData.legal_name,
          tax_id: entityData.tax_id || null,
          entity_type: entityData.entity_type || null,
          payment_terms: entityData.payment_terms || null,
          delivery_type: entityData.delivery_type || 'deposito',
          email: entityData.email || null,
          phone: entityData.phone || null,
          address: entityData.address || null,
          notes: entityData.notes || null,
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating entity:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Manejar términos comerciales
      if (commercial_terms !== undefined) {
        if (commercial_terms === null) {
          // Eliminar términos comerciales
          await supabaseAdmin
            .schema('mercure')
            .from('client_commercial_terms')
            .delete()
            .eq('entity_id', id);
        } else {
          // Upsert términos comerciales
          const { error: termsError } = await supabaseAdmin
            .schema('mercure')
            .from('client_commercial_terms')
            .upsert({
              entity_id: id,
              tariff_modifier: commercial_terms.tariff_modifier,
              insurance_rate: commercial_terms.insurance_rate,
              credit_days: commercial_terms.credit_days,
              is_active: true,
            }, { onConflict: 'entity_id' });
          
          if (termsError) {
            console.error('Error upserting commercial terms:', termsError);
          }
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Entidad actualizada correctamente' 
      });
    }

    return NextResponse.json({ error: 'ID de entidad requerido' }, { status: 400 });

  } catch (error) {
    console.error('Error in PUT /api/entidades:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body: CreateEntityRequest = await request.json();

    if (!body.legal_name) {
      return NextResponse.json({ error: 'Razón Social es requerida' }, { status: 400 });
    }

    // =========================================================
    // VALIDACIÓN DE DUPLICADOS
    // =========================================================
    
    // 1. Verificar si ya existe una entidad con el mismo CUIT
    if (body.tax_id && body.tax_id.trim() !== '') {
      const normalizedCuit = body.tax_id.replace(/[-\s]/g, '').trim();
      
      const { data: existingByCuit } = await supabaseAdmin
        .schema('mercure')
        .from('entities')
        .select('id, legal_name, tax_id')
        .or(`tax_id.eq.${normalizedCuit},tax_id.eq.${body.tax_id.trim()}`)
        .limit(1);
      
      if (existingByCuit && existingByCuit.length > 0) {
        const existing = existingByCuit[0];
        return NextResponse.json({ 
          error: `Ya existe una entidad con este CUIT: "${existing.legal_name}" (${existing.tax_id})`,
          duplicate: true,
          existingEntity: existing
        }, { status: 409 }); // 409 Conflict
      }
    }

    // 2. Verificar si ya existe una entidad con nombre muy similar
    const normalizedName = body.legal_name.trim().toLowerCase();
    const { data: existingByName } = await supabaseAdmin
      .schema('mercure')
      .from('entities')
      .select('id, legal_name, tax_id')
      .ilike('legal_name', normalizedName);
    
    if (existingByName && existingByName.length > 0) {
      const existing = existingByName[0];
      return NextResponse.json({ 
        error: `Ya existe una entidad con este nombre: "${existing.legal_name}"${existing.tax_id ? ` (CUIT: ${existing.tax_id})` : ''}`,
        duplicate: true,
        existingEntity: existing
      }, { status: 409 }); // 409 Conflict
    }

    // =========================================================
    // CREAR ENTIDAD (si no hay duplicados)
    // =========================================================
    
    const { data: newEntity, error: insertError } = await supabaseAdmin
      .schema('mercure')
      .from('entities')
      .insert({
        legal_name: body.legal_name.trim(),
        tax_id: body.tax_id?.trim() || null,
        entity_type: body.entity_type || null,
        payment_terms: body.payment_terms || null,
        delivery_type: body.delivery_type || 'deposito',
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        notes: body.notes?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating entity:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Guardar términos comerciales si están habilitados
    if (body.commercial_terms && newEntity) {
      const { error: termsError } = await supabaseAdmin
        .schema('mercure')
        .from('client_commercial_terms')
        .insert({
          entity_id: newEntity.id,
          tariff_modifier: body.commercial_terms.tariff_modifier,
          insurance_rate: body.commercial_terms.insurance_rate,
          credit_days: body.commercial_terms.credit_days,
          is_active: true,
        });
      
      if (termsError) {
        console.error('Error creating commercial terms:', termsError);
        // No fallar si los términos comerciales no se guardan
      }
    }

    return NextResponse.json({ 
      success: true, 
      entity: newEntity,
      message: 'Entidad creada correctamente' 
    });

  } catch (error) {
    console.error('Error in POST /api/entidades:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}



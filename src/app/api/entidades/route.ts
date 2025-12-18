import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";

interface CreateEntityRequest {
  legal_name: string;
  tax_id?: string;
  entity_type?: string;
  payment_terms?: string;
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

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body: CreateEntityRequest = await request.json();

    if (!body.legal_name) {
      return NextResponse.json({ error: 'Razón Social es requerida' }, { status: 400 });
    }

    // Crear entidad
    const { data: newEntity, error: insertError } = await supabaseAdmin
      .schema('mercure')
      .from('entities')
      .insert({
        legal_name: body.legal_name,
        tax_id: body.tax_id || null,
        entity_type: body.entity_type || null,
        payment_terms: body.payment_terms || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        notes: body.notes || null,
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



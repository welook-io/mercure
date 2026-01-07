import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { entityId, newEntity, conditions, justification, expectedVolume } = body;

    // Validaciones
    if (!entityId && !newEntity?.name) {
      return NextResponse.json(
        { error: 'Debe seleccionar un cliente existente o crear uno nuevo' },
        { status: 400 }
      );
    }

    if (!justification?.trim()) {
      return NextResponse.json(
        { error: 'La justificación es requerida' },
        { status: 400 }
      );
    }

    // Crear la solicitud
    const { data, error } = await supabase
      .schema('mercure').from('commercial_agreement_requests')
      .insert({
        entity_id: entityId || null,
        // Cliente nuevo
        new_entity_name: newEntity?.name || null,
        new_entity_cuit: newEntity?.cuit || null,
        new_entity_address: newEntity?.address || null,
        new_entity_phone: newEntity?.phone || null,
        new_entity_email: newEntity?.email || null,
        new_entity_contact_name: newEntity?.contactName || null,
        // Condiciones solicitadas
        requested_tariff_type: conditions?.tariffType || 'base',
        requested_tariff_modifier: conditions?.tariffModifier || 0,
        requested_insurance_rate: conditions?.insuranceRate || 0.008,
        requested_credit_terms: conditions?.creditTerms || 'contado',
        requested_credit_days: conditions?.creditDays || 0,
        requested_payment_method: conditions?.paymentMethod || 'transferencia',
        // Justificación
        justification: justification,
        expected_monthly_volume: expectedVolume || null,
        // Estado inicial
        status: 'pending_review',
        // Trazabilidad
        requested_by: userId,
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando solicitud:', error);
      return NextResponse.json(
        { error: 'Error al crear la solicitud' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Solicitud enviada para aprobación'
    });

  } catch (error) {
    console.error('Error en POST /api/commercial-agreements:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .schema('mercure').from('commercial_agreement_requests')
      .select(`
        *,
        entity:entities(id, legal_name, tax_id)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo solicitudes:', error);
      return NextResponse.json(
        { error: 'Error al obtener solicitudes' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en GET /api/commercial-agreements:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}














import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Obtener detalle de una solicitud
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data, error } = await supabase
      .schema('mercure').from('commercial_agreement_requests')
      .select(`
        *,
        entity:entities(id, legal_name, tax_id, address)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error obteniendo solicitud:', error);
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en GET:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH - Aprobar, rechazar o configurar
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, reviewNotes } = body;

    // Obtener solicitud actual
    const { data: agreement, error: fetchError } = await supabase
      .schema('mercure').from('commercial_agreement_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !agreement) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    // ACCIÓN: APROBAR
    if (action === 'approve') {
      if (agreement.status !== 'pending_review') {
        return NextResponse.json({ error: 'Esta solicitud no está pendiente de revisión' }, { status: 400 });
      }

      const { error } = await supabase
        .schema('mercure').from('commercial_agreement_requests')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error aprobando:', error);
        return NextResponse.json({ error: 'Error al aprobar' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Solicitud aprobada' });
    }

    // ACCIÓN: RECHAZAR
    if (action === 'reject') {
      if (agreement.status !== 'pending_review') {
        return NextResponse.json({ error: 'Esta solicitud no está pendiente de revisión' }, { status: 400 });
      }

      const { error } = await supabase
        .schema('mercure').from('commercial_agreement_requests')
        .update({
          status: 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error rechazando:', error);
        return NextResponse.json({ error: 'Error al rechazar' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Solicitud rechazada' });
    }

    // ACCIÓN: CONFIGURAR (crear cliente y/o términos comerciales)
    if (action === 'configure') {
      if (agreement.status !== 'approved') {
        return NextResponse.json({ error: 'Esta solicitud no está aprobada' }, { status: 400 });
      }

      let entityId = agreement.entity_id;

      // Si es cliente nuevo, crearlo
      if (!entityId && agreement.new_entity_name) {
        // =========================================================
        // VALIDACIÓN DE DUPLICADOS
        // =========================================================
        
        // 1. Verificar si ya existe una entidad con el mismo CUIT
        if (agreement.new_entity_cuit && agreement.new_entity_cuit.trim() !== '') {
          const normalizedCuit = agreement.new_entity_cuit.replace(/[-\s]/g, '').trim();
          
          const { data: existingByCuit } = await supabase
            .schema('mercure')
            .from('entities')
            .select('id, legal_name, tax_id')
            .or(`tax_id.eq.${normalizedCuit},tax_id.eq.${agreement.new_entity_cuit.trim()}`)
            .limit(1);
          
          if (existingByCuit && existingByCuit.length > 0) {
            const existing = existingByCuit[0];
            return NextResponse.json({ 
              error: `Ya existe un cliente con este CUIT: "${existing.legal_name}" (${existing.tax_id}). Puede vincular el acuerdo a ese cliente existente.`,
              duplicate: true,
              existingEntity: existing
            }, { status: 409 });
          }
        }

        // 2. Verificar si ya existe una entidad con nombre exacto
        const normalizedName = agreement.new_entity_name.trim().toLowerCase();
        const { data: existingByName } = await supabase
          .schema('mercure')
          .from('entities')
          .select('id, legal_name, tax_id')
          .ilike('legal_name', normalizedName);
        
        if (existingByName && existingByName.length > 0) {
          const existing = existingByName[0];
          return NextResponse.json({ 
            error: `Ya existe un cliente con este nombre: "${existing.legal_name}"${existing.tax_id ? ` (CUIT: ${existing.tax_id})` : ''}. Puede vincular el acuerdo a ese cliente existente.`,
            duplicate: true,
            existingEntity: existing
          }, { status: 409 });
        }

        // =========================================================
        // CREAR CLIENTE (si no hay duplicados)
        // =========================================================
        
        const { data: newEntity, error: createError } = await supabase
          .schema('mercure').from('entities')
          .insert({
            legal_name: agreement.new_entity_name.trim(),
            tax_id: agreement.new_entity_cuit?.trim() || null,
            address: agreement.new_entity_address?.trim() || null,
            phone: agreement.new_entity_phone?.trim() || null,
            email: agreement.new_entity_email?.trim() || null,
            contact_name: agreement.new_entity_contact_name?.trim() || null,
            entity_type: 'cliente',
            payment_terms: agreement.requested_credit_terms,
            // Trazabilidad
            requested_by: agreement.requested_by,
            requested_at: agreement.requested_at,
            approved_by: agreement.reviewed_by,
            approved_at: agreement.reviewed_at,
            status: 'active',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creando cliente:', createError);
          return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
        }

        entityId = newEntity.id;

        // Actualizar la solicitud con el entity_id
        await supabase
          .schema('mercure').from('commercial_agreement_requests')
          .update({ entity_id: entityId })
          .eq('id', id);
      }

      // Crear o actualizar términos comerciales
      if (entityId) {
        // Desactivar términos anteriores
        await supabase
          .schema('mercure').from('client_commercial_terms')
          .update({ is_active: false })
          .eq('entity_id', entityId);

        // Crear nuevos términos
        const { error: termsError } = await supabase
          .schema('mercure').from('client_commercial_terms')
          .insert({
            entity_id: entityId,
            credit_terms: agreement.requested_credit_terms,
            credit_days: agreement.requested_credit_days,
            payment_method: agreement.requested_payment_method,
            tariff_type: agreement.requested_tariff_type,
            tariff_modifier: agreement.requested_tariff_modifier,
            insurance_rate: agreement.requested_insurance_rate,
            is_active: true,
            agreement_request_id: agreement.id,
            configured_by: userId,
            configured_at: new Date().toISOString(),
          });

        if (termsError) {
          console.error('Error creando términos comerciales:', termsError);
          return NextResponse.json({ error: 'Error al configurar términos comerciales' }, { status: 500 });
        }
      }

      // Marcar solicitud como configurada
      const { error: updateError } = await supabase
        .schema('mercure').from('commercial_agreement_requests')
        .update({
          status: 'configured',
          configured_by: userId,
          configured_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error actualizando solicitud:', updateError);
        return NextResponse.json({ error: 'Error al finalizar configuración' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Cliente y términos comerciales configurados',
        entityId 
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error en PATCH:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}










import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clienteId = searchParams.get('cliente_id');

  if (!clienteId) {
    return NextResponse.json({ error: 'cliente_id requerido' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Obtener remitos pendientes de facturar
    const { data: remitos, error: remitosError } = await supabaseAdmin
      .schema('mercure')
      .from('shipments')
      .select(`
        id,
        delivery_note_number,
        created_at,
        weight_kg,
        volume_m3,
        declared_value,
        quotation_id,
        recipient_id
      `)
      .eq('sender_id', parseInt(clienteId))
      .is('invoice_id', null)
      .order('created_at', { ascending: false });

    if (remitosError) {
      console.error('Error fetching remitos:', remitosError);
      return NextResponse.json({ error: remitosError.message }, { status: 500 });
    }

    if (!remitos || remitos.length === 0) {
      return NextResponse.json({ remitos: [] });
    }

    // Obtener destinatarios
    const recipientIds = remitos.map(r => r.recipient_id).filter(Boolean) as number[];
    const { data: recipients } = await supabaseAdmin
      .schema('mercure')
      .from('entities')
      .select('id, legal_name')
      .in('id', recipientIds);

    const recipientsMap = new Map(recipients?.map(r => [r.id, r.legal_name]) || []);

    // Obtener cotizaciones
    const quotationIds = remitos.map(r => r.quotation_id).filter(Boolean) as number[];
    const { data: quotations } = await supabaseAdmin
      .schema('mercure')
      .from('quotations')
      .select('id, total_price')
      .in('id', quotationIds);

    const quotationsMap = new Map(quotations?.map(q => [q.id, q.total_price]) || []);

    // Armar respuesta
    const result = remitos.map(r => ({
      id: r.id,
      delivery_note_number: r.delivery_note_number,
      created_at: r.created_at,
      weight_kg: r.weight_kg,
      volume_m3: r.volume_m3,
      declared_value: r.declared_value,
      recipient_name: r.recipient_id ? recipientsMap.get(r.recipient_id) : null,
      quotation: {
        total_price: r.quotation_id ? quotationsMap.get(r.quotation_id) || 0 : 0
      }
    }));

    return NextResponse.json({ remitos: result });

  } catch (error) {
    console.error('Error in remitos-pendientes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}



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
    // El cliente es el DESTINATARIO (recipient_id), quien recibe y paga
    // Filtramos por payment_terms = 'cuenta_corriente' y excluimos las ya facturadas
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
        sender_id
      `)
      .eq('recipient_id', parseInt(clienteId))
      .eq('payment_terms', 'cuenta_corriente')
      .neq('status', 'facturada')
      .order('created_at', { ascending: false });

    if (remitosError) {
      console.error('Error fetching remitos:', remitosError);
      return NextResponse.json({ error: remitosError.message }, { status: 500 });
    }

    if (!remitos || remitos.length === 0) {
      return NextResponse.json({ remitos: [] });
    }

    // Obtener remitentes (quienes enviaron al cliente)
    const senderIds = remitos.map(r => r.sender_id).filter(Boolean) as number[];
    const { data: senders } = await supabaseAdmin
      .schema('mercure')
      .from('entities')
      .select('id, legal_name')
      .in('id', senderIds);

    const sendersMap = new Map(senders?.map(r => [r.id, r.legal_name]) || []);

    // Obtener cotizaciones
    const quotationIds = remitos.map(r => r.quotation_id).filter(Boolean) as number[];
    const { data: quotations } = await supabaseAdmin
      .schema('mercure')
      .from('quotations')
      .select('id, total_price')
      .in('id', quotationIds);

    const quotationsMap = new Map(quotations?.map(q => [q.id, q.total_price]) || []);

    // Armar respuesta - mostrar el remitente (quien envió al cliente)
    const result = remitos.map(r => ({
      id: r.id,
      delivery_note_number: r.delivery_note_number,
      created_at: r.created_at,
      weight_kg: r.weight_kg,
      volume_m3: r.volume_m3,
      declared_value: r.declared_value,
      recipient_name: r.sender_id ? sendersMap.get(r.sender_id) : null,
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













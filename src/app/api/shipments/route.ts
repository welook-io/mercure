import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";

// GET: Obtener cotización de un shipment
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const quotationId = searchParams.get('quotationId');

  if (quotationId) {
    const { data, error } = await supabaseAdmin
      .schema('mercure')
      .from('quotations')
      .select('total_price, base_price, insurance_cost')
      .eq('id', quotationId)
      .single();

    if (error) {
      console.error('Error fetching quotation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quotation: data });
  }

  return NextResponse.json({ error: 'Missing quotationId parameter' }, { status: 400 });
}

// PUT: Actualizar shipment
export async function PUT(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { shipmentId, updateData, newQuotation, entities } = body;

    if (!shipmentId) {
      return NextResponse.json({ error: 'shipmentId is required' }, { status: 400 });
    }

    const finalUpdateData: Record<string, unknown> = {
      delivery_note_number: updateData.delivery_note_number || null,
      sender_id: updateData.sender_id ? parseInt(updateData.sender_id) : null,
      recipient_id: updateData.recipient_id ? parseInt(updateData.recipient_id) : null,
      recipient_address: updateData.recipient_address || null,
      package_quantity: updateData.package_quantity ? parseInt(updateData.package_quantity) : 0,
      weight_kg: updateData.weight_kg ? parseFloat(updateData.weight_kg) : 0,
      volume_m3: updateData.volume_m3 ? parseFloat(updateData.volume_m3) : null,
      declared_value: updateData.declared_value ? parseFloat(updateData.declared_value) : 0,
      load_description: updateData.load_description || null,
      paid_by: updateData.paid_by || null,
      payment_terms: updateData.payment_terms || null,
      notes: updateData.notes || null,
    };

    // Si hay nueva cotización, crearla
    if (newQuotation && newQuotation.price > 0) {
      const recipient = entities?.find((e: any) => e.id.toString() === updateData.recipient_id);
      
      const { data: newQuot, error: quotError } = await supabaseAdmin
        .schema('mercure')
        .from('quotations')
        .insert({
          shipment_id: shipmentId,
          entity_id: updateData.recipient_id ? parseInt(updateData.recipient_id) : null,
          customer_name: recipient?.legal_name || 'Desconocido',
          customer_cuit: recipient?.tax_id || null,
          origin: 'Buenos Aires',
          destination: 'Jujuy',
          weight_kg: updateData.weight_kg ? parseFloat(updateData.weight_kg) : 0,
          volume_m3: updateData.volume_m3 ? parseFloat(updateData.volume_m3) : 0,
          volumetric_weight_kg: newQuotation.breakdown?.peso_volumetrico || null,
          chargeable_weight_kg: newQuotation.breakdown?.peso_cobrado || null,
          insurance_value: updateData.declared_value ? parseFloat(updateData.declared_value) : 0,
          base_price: newQuotation.isManual ? newQuotation.price : (newQuotation.breakdown?.flete_final || newQuotation.price),
          insurance_cost: newQuotation.isManual ? 0 : (newQuotation.breakdown?.seguro || 0),
          total_price: newQuotation.price,
          includes_iva: false,
          status: 'confirmed',
          source: newQuotation.isManual ? 'manual' : 'recotizacion',
          notes: newQuotation.isManual ? 'Precio ingresado manualmente' : null,
        })
        .select('id')
        .single();

      if (!quotError && newQuot) {
        finalUpdateData.quotation_id = newQuot.id;
      }
    }

    const { error } = await supabaseAdmin
      .schema('mercure')
      .from('shipments')
      .update(finalUpdateData)
      .eq('id', shipmentId);

    if (error) {
      console.error('Error updating shipment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Envío actualizado correctamente' });

  } catch (error) {
    console.error('Error in PUT /api/shipments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar shipment
export async function DELETE(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('id');

    if (!shipmentId) {
      return NextResponse.json({ error: 'shipmentId is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .schema('mercure')
      .from('shipments')
      .delete()
      .eq('id', parseInt(shipmentId));

    if (error) {
      console.error('Error deleting shipment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Remito eliminado correctamente' });

  } catch (error) {
    console.error('Error in DELETE /api/shipments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

// POST: Subir imagen de shipment
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const shipmentId = formData.get('shipmentId') as string;
    const type = formData.get('type') as 'remito' | 'cargo';

    if (!file || !shipmentId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${shipmentId}_${type}_${Date.now()}.${fileExt}`;
    const filePath = `shipments/${fileName}`;

    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Subir a Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('mercure-images')
      .upload(filePath, buffer, { 
        contentType: file.type,
        upsert: true 
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('mercure-images')
      .getPublicUrl(filePath);

    // Actualizar en la base de datos
    const updateField = type === 'remito' ? 'remito_image_url' : 'cargo_image_url';
    const { error: updateError } = await supabaseAdmin
      .schema('mercure')
      .from('shipments')
      .update({ [updateField]: publicUrl })
      .eq('id', parseInt(shipmentId));

    if (updateError) {
      console.error('Error updating shipment image:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      message: `Foto de ${type === 'remito' ? 'remito' : 'carga'} subida correctamente` 
    });

  } catch (error) {
    console.error('Error in POST /api/shipments:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}


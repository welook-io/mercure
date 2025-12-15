import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logShipmentCreated } from '@/lib/audit-log';
import { auth, currentUser } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface ReceptionData {
  deliveryNoteNumber: string;
  senderName: string;
  senderId: number | null;
  recipientName: string;
  recipientCuit: string;
  recipientAddress: string;
  recipientLocality: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientId: number | null;
  date: string;
  packageQuantity: string;
  weightKg: string;
  volumeM3: string;
  declaredValue: string;
  loadDescription: string;
  observations: string;
  paidBy: 'origen' | 'destino';
  paymentTerms: 'contado' | 'cuenta_corriente';
}

interface EntityData {
  name: string;
  cuit: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  paymentTerms: string | null;
}

async function findOrCreateEntity(entityData: EntityData): Promise<number> {
  const { name, cuit, address, phone, email, paymentTerms } = entityData;
  
  if (!name || name.trim() === '') {
    throw new Error('El nombre de la entidad es requerido');
  }

  // Buscar por CUIT si existe
  if (cuit && cuit.trim() !== '') {
    const { data: existingByCuit } = await supabaseAdmin
      .from('mercure_entities')
      .select('id')
      .eq('tax_id', cuit.trim())
      .single();
    
    if (existingByCuit) {
      return existingByCuit.id;
    }
  }

  // Buscar por nombre
  const { data: existingByName } = await supabaseAdmin
    .from('mercure_entities')
    .select('id')
    .ilike('legal_name', name.trim())
    .single();
  
  if (existingByName) {
    return existingByName.id;
  }

  // Crear nueva entidad con todos los campos
  const { data: newEntity, error } = await supabaseAdmin
    .from('mercure_entities')
    .insert({
      legal_name: name.trim(),
      tax_id: cuit?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      payment_terms: paymentTerms || 'contado',
      entity_type: 'cliente',
    })
    .select('id')
    .single();

  if (error || !newEntity) {
    throw new Error(`Error al crear entidad: ${error?.message}`);
  }

  return newEntity.id;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extraer datos del formulario
    const dataString = formData.get('data') as string;
    const remitoImage = formData.get('remito') as File | null;
    const cargaImage = formData.get('carga') as File | null;
    
    if (!dataString) {
      return NextResponse.json(
        { error: 'Datos del formulario requeridos' },
        { status: 400 }
      );
    }

    const data: ReceptionData = JSON.parse(dataString);

    // Validar campos requeridos
    if (!data.senderId && !data.senderName?.trim()) {
      return NextResponse.json(
        { error: 'El remitente es requerido' },
        { status: 400 }
      );
    }

    if (!data.recipientId && !data.recipientName?.trim()) {
      return NextResponse.json(
        { error: 'El destinatario es requerido' },
        { status: 400 }
      );
    }

    // Usar ID existente o crear entidad nueva
    let senderId: number;
    if (data.senderId) {
      senderId = data.senderId;
    } else {
      senderId = await findOrCreateEntity({
        name: data.senderName,
        cuit: null,
        address: null,
        phone: null,
        email: null,
        paymentTerms: null,
      });
    }

    let recipientId: number;
    if (data.recipientId) {
      recipientId = data.recipientId;
    } else {
      recipientId = await findOrCreateEntity({
        name: data.recipientName,
        cuit: data.recipientCuit,
        address: data.recipientAddress,
        phone: data.recipientPhone,
        email: data.recipientEmail,
        paymentTerms: data.paymentTerms,
      });
    }

    // Subir imágenes a Storage si existen
    let remitoImageUrl: string | null = null;
    let cargaImageUrl: string | null = null;

    if (remitoImage) {
      const timestamp = Date.now();
      const fileName = `remitos/${timestamp}_${remitoImage.name}`;
      const buffer = await remitoImage.arrayBuffer();
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('mercure-images')
        .upload(fileName, buffer, {
          contentType: remitoImage.type,
          upsert: true
        });

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage
          .from('mercure-images')
          .getPublicUrl(fileName);
        remitoImageUrl = urlData.publicUrl;
      }
    }

    if (cargaImage) {
      const timestamp = Date.now();
      const fileName = `cargas/${timestamp}_${cargaImage.name}`;
      const buffer = await cargaImage.arrayBuffer();
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from('mercure-images')
        .upload(fileName, buffer, {
          contentType: cargaImage.type,
          upsert: true
        });

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage
          .from('mercure-images')
          .getPublicUrl(fileName);
        cargaImageUrl = urlData.publicUrl;
      }
    }

    // Crear el shipment
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('mercure_shipments')
      .insert({
        delivery_note_number: data.deliveryNoteNumber?.trim() || null,
        status: 'ingresada',
        sender_id: senderId,
        recipient_id: recipientId,
        recipient_address: data.recipientAddress?.trim() || null,
        load_description: data.loadDescription?.trim() || null,
        package_quantity: data.packageQuantity ? parseInt(data.packageQuantity) : null,
        weight_kg: data.weightKg ? parseFloat(data.weightKg) : null,
        volume_m3: data.volumeM3 ? parseFloat(data.volumeM3) : null,
        declared_value: data.declaredValue ? parseFloat(data.declaredValue) : null,
        paid_by: data.paidBy || 'destino',
        payment_terms: data.paymentTerms || 'contado',
        notes: data.observations?.trim() || null,
        remito_image_url: remitoImageUrl,
        cargo_image_url: cargaImageUrl,
      })
      .select('id')
      .single();

    if (shipmentError || !shipment) {
      console.error('Error creating shipment:', shipmentError);
      return NextResponse.json(
        { error: `Error al crear el envío: ${shipmentError?.message}` },
        { status: 500 }
      );
    }

    // Crear evento de recepción
    await supabaseAdmin
      .from('mercure_events')
      .insert({
        event_type: 'shipment_received',
        shipment_id: shipment.id,
        metadata: {
          delivery_note_number: data.deliveryNoteNumber,
          received_at: new Date().toISOString(),
        }
      });

    // Calcular cotización automáticamente si hay datos suficientes (peso o volumen)
    let quotationId: string | null = null;
    const hasWeight = data.weightKg && parseFloat(data.weightKg) > 0;
    const hasVolume = data.volumeM3 && parseFloat(data.volumeM3) > 0;
    
    if (hasWeight || hasVolume) {
      try {
        // Llamar al cotizador
        const weightKg = data.weightKg ? parseFloat(data.weightKg) : 0;
        const volumeM3 = data.volumeM3 ? parseFloat(data.volumeM3) : 0;
        const declaredValue = data.declaredValue ? parseFloat(data.declaredValue) : 0;
        
        const pricingResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/detect-pricing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: recipientId, // El que paga es normalmente el destinatario
            cargo: {
              weightKg,
              volumeM3,
              declaredValue,
            },
            origin: 'Buenos Aires',
            destination: 'Jujuy',
          }),
        });

        if (pricingResponse.ok) {
          const pricingResult = await pricingResponse.json();
          const pricing = pricingResult.pricing;
          
          console.log('[save-reception] Pricing result:', JSON.stringify(pricingResult, null, 2));
          
          if (pricing?.price && pricing.price > 0) {
            // Guardar la cotización
            const { data: quotation, error: quotationError } = await supabaseAdmin
              .from('mercure_quotations')
              .insert({
                shipment_id: shipment.id,
                entity_id: recipientId,
                customer_name: data.recipientName,
                customer_cuit: data.recipientCuit || null,
                origin: 'Buenos Aires',
                destination: 'Jujuy',
                weight_kg: weightKg,
                volume_m3: volumeM3,
                volumetric_weight_kg: pricing.breakdown?.peso_volumetrico || null,
                chargeable_weight_kg: pricing.breakdown?.peso_cobrado || Math.max(weightKg, volumeM3 * 300),
                base_price: pricing.breakdown?.flete_final || pricing.breakdown?.flete_lista || pricing.price,
                insurance_value: declaredValue || null, // Valor declarado para el seguro
                insurance_cost: pricing.breakdown?.seguro || 0,
                total_price: pricing.price,
                includes_iva: false,
                status: 'confirmed',
                source: 'reception',
                package_quantity: data.packageQuantity ? parseInt(data.packageQuantity) : null,
                declared_description: data.loadDescription || null,
              })
              .select('id')
              .single();

            if (!quotationError && quotation) {
              quotationId = quotation.id;
              
              // Actualizar el shipment con el quotation_id
              await supabaseAdmin
                .from('mercure_shipments')
                .update({ quotation_id: quotationId })
                .eq('id', shipment.id);
            } else {
              console.error('Error creating quotation:', quotationError);
            }
          }
        }
      } catch (pricingError) {
        console.error('Error calculating pricing:', pricingError);
        // No fallar el guardado si el pricing falla
      }
    }

    // Registrar en audit log con info del usuario
    let userOverride: { userId?: string; email?: string; name?: string } | undefined;
    try {
      const { userId: clerkId } = await auth();
      if (clerkId) {
        const user = await currentUser();
        userOverride = {
          email: user?.emailAddresses[0]?.emailAddress,
          name: user?.fullName || user?.firstName || undefined,
        };
      }
    } catch {
      // Si no se puede obtener el usuario, continuar sin él
    }

    await logShipmentCreated(
      shipment.id, 
      data.deliveryNoteNumber || null,
      data.senderName,
      data.recipientName,
      userOverride
    );

    return NextResponse.json({ 
      success: true, 
      shipmentId: shipment.id,
      message: 'Recepción registrada correctamente'
    });

  } catch (error) {
    console.error('Error saving reception:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al guardar la recepción' },
      { status: 500 }
    );
  }
}



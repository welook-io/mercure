import { NextRequest, NextResponse } from 'next/server';
import { createFCE } from '@/lib/afip/wsfe';
import { CONCEPT_CODES, DOC_TYPE_CODES, FCEType } from '@/lib/afip/types';
import { supabaseAdmin } from "@/lib/supabase";

interface FCERequest {
  // Datos del cliente
  cliente_id?: number;
  cliente_cuit: string;
  cliente_nombre: string;
  
  // Tipo de FCE
  fce_type: FCEType; // 'FCE_A' | 'FCE_B' | 'FCE_C'
  point_of_sale: number;
  
  // Montos
  concepto: string;
  neto: number;
  iva: number;
  total: number;
  
  // Para servicios
  periodo_desde?: string;
  periodo_hasta?: string;
  
  // Campos específicos FCE
  cbu_emisor: string;          // CBU del emisor (22 dígitos) - obligatorio
  alias_emisor?: string;       // Alias del CBU emisor
  cbu_receptor?: string;       // CBU del receptor (para pago directo)
  alias_receptor?: string;     // Alias del CBU receptor
  sca?: 'S' | 'N';             // Sistema Circulación Abierta (S=transferible)
}

export async function POST(request: NextRequest) {
  try {
    const body: FCERequest = await request.json();
    
    // Validaciones
    if (!body.cliente_cuit || !body.cliente_nombre) {
      return NextResponse.json(
        { error: 'Faltan datos del cliente (CUIT y nombre son obligatorios)' },
        { status: 400 }
      );
    }
    
    if (!body.cbu_emisor || body.cbu_emisor.length !== 22) {
      return NextResponse.json(
        { error: 'El CBU del emisor es obligatorio y debe tener 22 dígitos' },
        { status: 400 }
      );
    }
    
    if (!body.neto || !body.total) {
      return NextResponse.json(
        { error: 'Montos inválidos' },
        { status: 400 }
      );
    }
    
    const today = new Date();
    const invoiceDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Fecha de vencimiento del pago (30 días para FCE)
    const paymentDue = new Date(today);
    paymentDue.setDate(paymentDue.getDate() + 30);
    const paymentDueDate = paymentDue.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Determinar concepto
    let concept: number = CONCEPT_CODES.SERVICIOS;
    if (body.concepto === 'productos') {
      concept = CONCEPT_CODES.PRODUCTOS;
    } else if (body.concepto === 'productos_y_servicios') {
      concept = CONCEPT_CODES.PRODUCTOS_Y_SERVICIOS;
    }
    
    // Parsear CUIT
    const cuitClean = body.cliente_cuit.replace(/-/g, '');
    
    // Crear FCE con AFIP
    const result = await createFCE({
      fceType: body.fce_type,
      pointOfSale: body.point_of_sale,
      concept,
      docType: DOC_TYPE_CODES.CUIT,
      docNumber: cuitClean,
      invoiceDate,
      totalAmount: body.total,
      netAmount: body.neto,
      ivaAmount: body.iva,
      serviceFrom: body.periodo_desde,
      serviceTo: body.periodo_hasta,
      paymentDueDate,
      cbuEmisor: body.cbu_emisor,
      aliasEmisor: body.alias_emisor,
      cbuReceptor: body.cbu_receptor,
      aliasReceptor: body.alias_receptor,
      sca: body.sca || 'S',
    });
    
    if (!result.success) {
      console.error('Error AFIP FCE:', result.errors);
      return NextResponse.json({
        success: false,
        error: result.errors?.[0]?.message || 'Error al generar la FCE',
        errors: result.errors,
        observations: result.observations,
      }, { status: 400 });
    }
    
    // Formatear número de comprobante
    const fceNumber = `${body.point_of_sale.toString().padStart(5, '0')}-${result.invoiceNumber?.toString().padStart(8, '0')}`;
    
    // Formatear vencimiento CAE
    const caeExp = result.caeExpiration;
    const caeExpirationFormatted = caeExp 
      ? `${caeExp.slice(0, 4)}-${caeExp.slice(4, 6)}-${caeExp.slice(6, 8)}` 
      : null;

    // Guardar en la base de datos
    if (supabaseAdmin) {
      await supabaseAdmin
        .schema('mercure').from('invoices')
        .insert({
          invoice_number: fceNumber,
          invoice_type: body.fce_type.replace('FCE_', ''), // Guardar A, B o C
          voucher_type: body.fce_type, // FCE_A, FCE_B, FCE_C
          point_of_sale: body.point_of_sale,
          issue_date: today.toISOString().slice(0, 10),
          client_entity_id: body.cliente_id || null,
          client_cuit: body.cliente_cuit,
          client_name: body.cliente_nombre,
          client_iva_condition: 'IVA Responsable Inscripto',
          neto: body.neto,
          iva: body.iva,
          total: body.total,
          cae: result.cae,
          cae_expiration: caeExpirationFormatted,
          afip_response: result.rawResponse,
          notes: `CBU Emisor: ${body.cbu_emisor}`,
        });
    }

    return NextResponse.json({
      success: true,
      cae: result.cae,
      caeExpiration: caeExpirationFormatted,
      fceNumber,
      invoiceNumber: result.invoiceNumber,
      message: `FCE MiPyME ${body.fce_type.replace('FCE_', '')} emitida correctamente`,
    });

  } catch (error) {
    console.error('Error en POST /api/afip/fce:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}












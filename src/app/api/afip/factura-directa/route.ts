import { NextRequest, NextResponse } from 'next/server';
import { createInvoice, getLastVoucherNumber, checkServiceStatus } from '@/lib/afip/wsfe';
import { CONCEPT_CODES, DOC_TYPE_CODES, InvoiceType } from '@/lib/afip/types';
import { supabaseAdmin } from "@/lib/supabase";

interface FacturaDirectaRequest {
  cliente_id: number;
  cliente_cuit: string;
  cliente_nombre: string;
  invoice_type: InvoiceType;
  point_of_sale: number;
  concepto: string;
  neto: number;
  iva: number;
  total: number;
  periodo_desde?: string; // YYYYMMDD
  periodo_hasta?: string; // YYYYMMDD
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as FacturaDirectaRequest;
    
    console.log('=== FACTURA DIRECTA REQUEST ===');
    console.log('Cliente:', body.cliente_nombre, '- CUIT:', body.cliente_cuit);
    console.log('Tipo:', body.invoice_type, '- PV:', body.point_of_sale);
    console.log('Neto:', body.neto, '- IVA:', body.iva, '- Total:', body.total);
    console.log('================================');

    // Validaciones
    if (!body.cliente_cuit) {
      return NextResponse.json({ error: 'CUIT del cliente es requerido' }, { status: 400 });
    }
    if (!body.total || body.total <= 0) {
      return NextResponse.json({ error: 'Total debe ser mayor a 0' }, { status: 400 });
    }

    // Verificar servicio AFIP
    const status = await checkServiceStatus();
    console.log('AFIP Status:', status);
    
    if (!status.appServer || !status.dbServer || !status.authServer) {
      console.log('AFIP services status:', status);
      // No bloquear, intentar igual
    }

    // Preparar fecha
    const today = new Date();
    const invoiceDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Fechas de servicio (para concepto SERVICIOS es obligatorio)
    const mesAnterior = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const finMesAnterior = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const serviceFrom = body.periodo_desde || 
      mesAnterior.toISOString().slice(0, 10).replace(/-/g, '');
    const serviceTo = body.periodo_hasta || 
      finMesAnterior.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Fecha de vencimiento de pago (30 días)
    const paymentDue = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const paymentDueDate = paymentDue.toISOString().slice(0, 10).replace(/-/g, '');

    // Limpiar CUIT
    const docNumber = body.cliente_cuit.replace(/-/g, '');

    // Llamar a WSFE
    const result = await createInvoice({
      invoiceType: body.invoice_type,
      pointOfSale: body.point_of_sale,
      concept: CONCEPT_CODES.SERVICIOS,
      docType: DOC_TYPE_CODES.CUIT,
      docNumber,
      invoiceDate,
      totalAmount: body.total,
      netAmount: body.neto,
      ivaAmount: body.iva,
      serviceFrom,
      serviceTo,
      paymentDueDate,
    });

    console.log('=== AFIP RESULT ===');
    console.log('Success:', result.success);
    console.log('CAE:', result.cae);
    console.log('Errors:', result.errors);
    console.log('===================');

    if (!result.success) {
      return NextResponse.json({
        error: 'Error AFIP',
        details: result.errors || result.observations,
        rawResponse: result.rawResponse,
      }, { status: 500 });
    }

    // Formatear número de factura
    const invoiceNumber = `${String(body.point_of_sale).padStart(4, '0')}-${String(result.invoiceNumber).padStart(8, '0')}`;
    
    // Formatear vencimiento CAE
    const caeExp = result.caeExpiration;
    const caeExpirationFormatted = caeExp 
      ? `${caeExp.slice(0, 4)}-${caeExp.slice(4, 6)}-${caeExp.slice(6, 8)}` 
      : null;

    // Guardar la factura en la tabla de facturas
    await supabaseAdmin!
      .schema('mercure').from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        invoice_type: body.invoice_type,
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
      });

    return NextResponse.json({
      success: true,
      cae: result.cae,
      caeExpiration: caeExpirationFormatted,
      invoiceNumber,
      invoiceType: body.invoice_type,
      pointOfSale: body.point_of_sale,
      cliente: body.cliente_nombre,
      total: body.total,
    });

  } catch (error) {
    console.error('Error en /api/afip/factura-directa:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error interno',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pointOfSale = parseInt(searchParams.get('point_of_sale') || '4');
    const invoiceType = (searchParams.get('invoice_type') || 'A') as InvoiceType;

    // Verificar status
    const status = await checkServiceStatus();
    
    // Obtener último número
    let lastNumber = 0;
    let nextNumber = 1;
    
    try {
      lastNumber = await getLastVoucherNumber(pointOfSale, invoiceType);
      nextNumber = lastNumber + 1;
    } catch (e) {
      console.error('Error obteniendo último número:', e);
    }

    return NextResponse.json({
      status,
      pointOfSale,
      invoiceType,
      lastNumber,
      nextNumber,
      environment: process.env.AFIP_ENV || 'testing',
      cuit: process.env.AFIP_CUIT || '30716254972',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}


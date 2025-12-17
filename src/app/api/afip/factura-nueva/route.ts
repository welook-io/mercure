import { NextRequest, NextResponse } from 'next/server';
import { createInvoice } from '@/lib/afip/wsfe';
import { CONCEPT_CODES, DOC_TYPE_CODES, InvoiceType } from '@/lib/afip/types';
import { supabaseAdmin } from "@/lib/supabase";
import { sendInvoiceEmail, getClientEmail } from '@/lib/email';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { logInvoiceCreated } from '@/lib/audit-log';

interface FacturaNuevaRequest {
  cliente_id?: number;
  cliente_cuit: string;
  cliente_nombre: string;
  invoice_type: InvoiceType;
  point_of_sale: number;
  concepto: string;
  neto: number;
  iva: number;
  total: number;
  emission_mode: 'manual' | 'automatic';
  remito_ids?: number[];
  send_email?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as FacturaNuevaRequest;
    
    console.log('=== NUEVA FACTURA REQUEST ===');
    console.log('Modo:', body.emission_mode);
    console.log('Cliente:', body.cliente_nombre, '- CUIT:', body.cliente_cuit);
    console.log('Tipo:', body.invoice_type, '- PV:', body.point_of_sale);
    console.log('Neto:', body.neto, '- IVA:', body.iva, '- Total:', body.total);
    if (body.remito_ids) {
      console.log('Remitos:', body.remito_ids.length);
    }
    console.log('=============================');

    // Validaciones
    if (!body.cliente_cuit) {
      return NextResponse.json({ error: 'CUIT del cliente es requerido' }, { status: 400 });
    }
    if (!body.total || body.total <= 0) {
      return NextResponse.json({ error: 'Total debe ser mayor a 0' }, { status: 400 });
    }
    if (body.emission_mode === 'automatic' && (!body.remito_ids || body.remito_ids.length === 0)) {
      return NextResponse.json({ error: 'Seleccione al menos un remito' }, { status: 400 });
    }

    // Preparar fechas
    const today = new Date();
    const invoiceDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Fechas de servicio
    const mesAnterior = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const finMesAnterior = new Date(today.getFullYear(), today.getMonth(), 0);
    const serviceFrom = mesAnterior.toISOString().slice(0, 10).replace(/-/g, '');
    const serviceTo = finMesAnterior.toISOString().slice(0, 10).replace(/-/g, '');
    
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

    // Guardar la factura en la base de datos
    const { data: invoiceData, error: invoiceError } = await supabaseAdmin!
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
        emission_mode: body.emission_mode,
        description: body.concepto,
        afip_response: result.rawResponse,
      })
      .select('id')
      .single();

    if (invoiceError) {
      console.error('Error guardando factura:', invoiceError);
    } else if (invoiceData) {
      // Registrar en audit log
      await logInvoiceCreated(invoiceData.id, invoiceNumber, body.cliente_nombre, body.total);
    }

    // Si es modo automático, vincular los remitos con la factura
    if (body.emission_mode === 'automatic' && body.remito_ids && invoiceData) {
      const { error: updateError } = await supabaseAdmin!
        .schema('mercure').from('shipments')
        .update({ invoice_id: invoiceData.id })
        .in('id', body.remito_ids);

      if (updateError) {
        console.error('Error vinculando remitos:', updateError);
      } else {
        console.log(`✓ ${body.remito_ids.length} remitos vinculados a factura ${invoiceNumber}`);
      }
    }

    // Enviar email si está habilitado
    let emailSent = false;
    let emailError: string | undefined;

    if (body.send_email && body.cliente_id) {
      try {
        const clientEmail = await getClientEmail(body.cliente_id);
        
        if (clientEmail) {
          // Generar PDF
          const pdfBuffer = await generateInvoicePdf({
            invoiceNumber,
            invoiceType: body.invoice_type,
            cae: result.cae!,
            caeExpiration: caeExpirationFormatted || '',
            clienteCuit: body.cliente_cuit,
            clienteNombre: body.cliente_nombre,
            neto: body.neto,
            iva: body.iva,
            total: body.total,
          });

          // Enviar email
          const emailResult = await sendInvoiceEmail({
            to: clientEmail,
            clientName: body.cliente_nombre,
            invoiceNumber,
            cae: result.cae!,
            caeExpiration: caeExpirationFormatted || '',
            total: body.total,
            pdfBuffer,
          });

          emailSent = emailResult.success;
          emailError = emailResult.error;
          
          if (emailSent) {
            console.log(`✓ Email enviado a ${clientEmail}`);
          } else {
            console.error(`✗ Error enviando email:`, emailError);
          }
        } else {
          emailError = 'Cliente sin email registrado';
          console.warn(`⚠ Cliente ${body.cliente_nombre} no tiene email registrado`);
        }
      } catch (e) {
        emailError = e instanceof Error ? e.message : 'Error al enviar email';
        console.error('Error en envío de email:', e);
      }
    }

    return NextResponse.json({
      success: true,
      cae: result.cae,
      caeExpiration: caeExpirationFormatted,
      invoiceNumber,
      invoiceType: body.invoice_type,
      pointOfSale: body.point_of_sale,
      cliente: body.cliente_nombre,
      total: body.total,
      emissionMode: body.emission_mode,
      remitosFacturados: body.remito_ids?.length || 0,
      emailSent,
      emailError,
    });

  } catch (error) {
    console.error('Error en /api/afip/factura-nueva:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error interno',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}


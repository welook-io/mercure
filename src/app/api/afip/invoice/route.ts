import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createInvoice, getLastVoucherNumber } from '@/lib/afip/wsfe';
import { CONCEPT_CODES, DOC_TYPE_CODES, InvoiceType } from '@/lib/afip/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settlement_id, invoice_type = 'A', point_of_sale = 4 } = body as {
      settlement_id: number;
      invoice_type?: InvoiceType;
      point_of_sale?: number;
    };

    if (!settlement_id) {
      return NextResponse.json({ error: 'settlement_id es requerido' }, { status: 400 });
    }

    const { data: settlement, error: settlementError } = await supabase
      .from('mercure_client_settlements')
      .select(`*, entity:mercure_entities(id, legal_name, tax_id, address)`)
      .eq('id', settlement_id)
      .single();

    if (settlementError || !settlement) {
      return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 });
    }

    if (settlement.cae) {
      return NextResponse.json({ error: 'Ya tiene CAE', cae: settlement.cae }, { status: 400 });
    }

    const entity = settlement.entity as { id: number; legal_name: string; tax_id: string | null };

    if (!entity.tax_id) {
      return NextResponse.json({ error: 'Cliente sin CUIT' }, { status: 400 });
    }

    const today = new Date();
    const invoiceDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    const paymentDue = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const paymentDueDate = paymentDue.toISOString().slice(0, 10).replace(/-/g, '');

    const netAmount = parseFloat(settlement.subtotal_flete) + parseFloat(settlement.subtotal_seguro);
    const ivaAmount = parseFloat(settlement.subtotal_iva);
    const totalAmount = parseFloat(settlement.total_amount);
    const docNumber = entity.tax_id.replace(/-/g, '');

    const result = await createInvoice({
      invoiceType: invoice_type,
      pointOfSale: point_of_sale,
      concept: CONCEPT_CODES.SERVICIOS,
      docType: DOC_TYPE_CODES.CUIT,
      docNumber,
      invoiceDate,
      totalAmount,
      netAmount,
      ivaAmount,
      serviceFrom: invoiceDate,
      serviceTo: invoiceDate,
      paymentDueDate,
    });

    if (!result.success) {
      return NextResponse.json({
        error: 'Error AFIP',
        details: result.errors || result.observations,
      }, { status: 500 });
    }

    const invoiceNumber = `${String(point_of_sale).padStart(4, '0')}-${String(result.invoiceNumber).padStart(8, '0')}`;
    const caeExp = result.caeExpiration;
    const caeExpirationFormatted = caeExp ? `${caeExp.slice(0, 4)}-${caeExp.slice(4, 6)}-${caeExp.slice(6, 8)}` : null;

    await supabase
      .from('mercure_client_settlements')
      .update({
        status: 'facturada',
        invoice_number: invoiceNumber,
        invoice_type: invoice_type,
        invoice_point_of_sale: point_of_sale,
        invoice_date: today.toISOString().slice(0, 10),
        cae: result.cae,
        cae_expiration: caeExpirationFormatted,
        afip_response: result.rawResponse,
      })
      .eq('id', settlement_id);

    // Guardar la factura en la tabla de facturas
    await supabase
      .from('mercure_invoices')
      .insert({
        invoice_number: invoiceNumber,
        invoice_type: invoice_type,
        point_of_sale: point_of_sale,
        issue_date: today.toISOString().slice(0, 10),
        client_entity_id: entity.id,
        client_cuit: entity.tax_id,
        client_name: entity.legal_name,
        client_iva_condition: 'IVA Responsable Inscripto',
        neto: netAmount,
        iva: ivaAmount,
        total: totalAmount,
        cae: result.cae,
        cae_expiration: caeExpirationFormatted,
        settlement_id: settlement_id,
        afip_response: result.rawResponse,
      });

    return NextResponse.json({
      success: true,
      cae: result.cae,
      caeExpiration: caeExpirationFormatted,
      invoiceNumber,
    });

  } catch (error) {
    console.error('Error en /api/afip/invoice:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pointOfSale = parseInt(searchParams.get('point_of_sale') || '4');
    const invoiceType = (searchParams.get('invoice_type') || 'A') as InvoiceType;

    const lastNumber = await getLastVoucherNumber(pointOfSale, invoiceType);

    return NextResponse.json({
      pointOfSale,
      invoiceType,
      lastNumber,
      nextNumber: lastNumber + 1,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}


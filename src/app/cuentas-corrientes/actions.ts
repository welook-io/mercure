"use server";

import { supabaseAdmin } from "@/lib/supabase";

export async function getClientShipments(entityId: number) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  const { data: shipmentsData } = await supabaseAdmin
    .schema('mercure')
    .from('shipments')
    .select(`
      id,
      delivery_note_number,
      created_at,
      package_quantity,
      weight_kg,
      declared_value,
      quotation_id,
      recipient:entities!recipient_id(legal_name)
    `)
    .eq('sender_id', entityId)
    .eq('status', 'rendida')
    .order('created_at', { ascending: false });

  // Cargar precios de cotizaciones asociadas
  const mappedShipments = await Promise.all(
    (shipmentsData || []).map(async (s) => {
      const recipientData = s.recipient as { legal_name: string } | { legal_name: string }[] | null;
      const recipient = Array.isArray(recipientData) ? recipientData[0] : recipientData;
      const declaredValue = s.declared_value || 0;
      
      let calculatedAmount = 0;
      if (s.quotation_id) {
        const { data: quotation } = await supabaseAdmin!
          .schema('mercure')
          .from('quotations')
          .select('total_price')
          .eq('id', s.quotation_id)
          .single();
        calculatedAmount = quotation?.total_price || 0;
      }

      return {
        id: s.id,
        delivery_note_number: s.delivery_note_number,
        created_at: s.created_at,
        recipient_name: recipient?.legal_name || '-',
        origin: 'LANUS',
        destination: 'SALTA',
        package_quantity: s.package_quantity,
        weight_kg: s.weight_kg,
        declared_value: declaredValue,
        calculated_amount: calculatedAmount,
        quotation_id: s.quotation_id,
      };
    })
  );
  
  return mappedShipments;
}

export async function getQuotationPrice(quotationId: string) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  const { data } = await supabaseAdmin
    .schema('mercure')
    .from('quotations')
    .select('total_price, base_price, insurance_cost')
    .eq('id', quotationId)
    .single();
  
  return data;
}

export async function getClientSettlements(entityId: number) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  const { data } = await supabaseAdmin
    .schema('mercure')
    .from('client_settlements')
    .select('id, settlement_number, settlement_date, total_amount, status, invoice_number, invoice_pdf_url, cae')
    .eq('entity_id', entityId)
    .order('settlement_date', { ascending: false });
  
  return data || [];
}

export async function getNextSettlementNumber() {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  const { data } = await supabaseAdmin
    .schema('mercure')
    .from('client_settlements')
    .select('settlement_number')
    .order('settlement_number', { ascending: false })
    .limit(1)
    .single();
  
  return (data?.settlement_number || 0) + 1;
}

interface ShipmentForSettlement {
  id: number;
  delivery_note_number: string | null;
  created_at: string;
  recipient_name: string;
  origin: string;
  destination: string;
  package_quantity: number | null;
  weight_kg: number | null;
  calculated_amount: number;
  quotation_id: string | null;
}

export async function generateSettlement(
  clientId: number,
  selectedShipments: ShipmentForSettlement[],
  userId: string,
  userName: string
) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  // Cargar cotizaciones para obtener desglose de flete y seguro
  const shipmentsWithQuotations = await Promise.all(
    selectedShipments.map(async (s) => {
      let fleteAmount = 0;
      let seguroAmount = 0;
      
      if (s.quotation_id) {
        const { data: quotation } = await supabaseAdmin!
          .schema('mercure')
          .from('quotations')
          .select('base_price, insurance_cost')
          .eq('id', s.quotation_id)
          .single();
        fleteAmount = quotation?.base_price || 0;
        seguroAmount = quotation?.insurance_cost || 0;
      }
      
      return { ...s, fleteAmount, seguroAmount };
    })
  );
  
  const subtotalFlete = shipmentsWithQuotations.reduce((acc, s) => acc + s.fleteAmount, 0);
  const subtotalSeguro = shipmentsWithQuotations.reduce((acc, s) => acc + s.seguroAmount, 0);
  const subtotal = subtotalFlete + subtotalSeguro;
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const { data: maxData } = await supabaseAdmin
    .schema('mercure')
    .from('client_settlements')
    .select('settlement_number')
    .order('settlement_number', { ascending: false })
    .limit(1)
    .single();
  
  const nextNumber = (maxData?.settlement_number || 0) + 1;

  const { data: settlement, error } = await supabaseAdmin
    .schema('mercure')
    .from('client_settlements')
    .insert({
      settlement_number: nextNumber,
      entity_id: clientId,
      generated_by: userId,
      generated_by_name: userName,
      subtotal_flete: subtotalFlete,
      subtotal_seguro: subtotalSeguro,
      subtotal_iva: iva,
      total_amount: total,
      status: 'generada',
    })
    .select()
    .single();

  if (error) throw error;

  const items = shipmentsWithQuotations.map((s, index) => ({
    settlement_id: settlement.id,
    shipment_id: s.id,
    delivery_note_number: s.delivery_note_number || `#${s.id}`,
    emission_date: s.created_at,
    recipient_name: s.recipient_name,
    origin: s.origin,
    destination: s.destination,
    package_quantity: s.package_quantity,
    weight_kg: s.weight_kg,
    flete_amount: s.fleteAmount,
    seguro_amount: s.seguroAmount,
    total_amount: s.calculated_amount,
    sort_order: index,
  }));

  await supabaseAdmin
    .schema('mercure')
    .from('settlement_items')
    .insert(items);

  await supabaseAdmin
    .schema('mercure')
    .from('shipments')
    .update({ status: 'facturada' })
    .in('id', selectedShipments.map(s => s.id));

  return settlement;
}


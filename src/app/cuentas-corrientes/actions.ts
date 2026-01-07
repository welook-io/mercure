"use server";

import { supabaseAdmin } from "@/lib/supabase";

export async function getClientShipments(entityId: number) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  // Obtener envíos pendientes de cobro para cuenta corriente
  // El cliente es el DESTINATARIO (recipient_id), quien recibe y paga
  // Filtramos por payment_terms = 'cuenta_corriente' y excluimos las ya facturadas
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
      sender_id,
      origin,
      destination,
      pickup_fee,
      status
    `)
    .eq('recipient_id', entityId)
    .eq('payment_terms', 'cuenta_corriente')
    .neq('status', 'facturada')
    .order('created_at', { ascending: false });
  
  // Obtener nombres de remitentes (quien envió al cliente)
  const senderIds = [...new Set((shipmentsData || []).map(s => s.sender_id).filter(Boolean))];
  let sendersMap: Record<number, string> = {};
  if (senderIds.length > 0) {
    const { data: senders } = await supabaseAdmin
      .schema('mercure')
      .from('entities')
      .select('id, legal_name')
      .in('id', senderIds);
    if (senders) {
      sendersMap = Object.fromEntries(senders.map(r => [r.id, r.legal_name]));
    }
  }

  // Obtener precios de cotizaciones
  const quotationIds = [...new Set((shipmentsData || []).map(s => s.quotation_id).filter(Boolean))];
  let quotationsMap: Record<string, number> = {};
  if (quotationIds.length > 0) {
    const { data: quotations } = await supabaseAdmin
      .schema('mercure')
      .from('quotations')
      .select('id, total_price')
      .in('id', quotationIds);
    if (quotations) {
      quotationsMap = Object.fromEntries(quotations.map(q => [q.id, q.total_price || 0]));
    }
  }

  // Mapear envíos con datos
  const mappedShipments = (shipmentsData || []).map((s) => {
    // Ahora mostramos el remitente (quien envió al cliente)
    const senderName = s.sender_id ? (sendersMap[s.sender_id] || '-') : '-';
    const pickupFee = Number(s.pickup_fee) || 0;
    
    // Calcular monto: prioridad 1. cotización (ya incluye pickup_fee), 2. cálculo básico por peso + pickup_fee
    let calculatedAmount = 0;
    if (s.quotation_id && quotationsMap[s.quotation_id]) {
      // La cotización ya tiene el total con pickup_fee incluido
      calculatedAmount = quotationsMap[s.quotation_id];
    } else if (s.weight_kg && s.weight_kg > 0) {
      // Fallback: cálculo básico por peso + pickup_fee
      const baseFlete = Math.max(s.weight_kg * 500, 5000);
      const insuranceCost = (s.declared_value || 0) * 0.008;
      calculatedAmount = baseFlete + insuranceCost + pickupFee;
    } else if (s.declared_value && s.declared_value > 0) {
      // Fallback 2: solo si hay valor declarado + pickup_fee
      calculatedAmount = s.declared_value * 0.05 + pickupFee;
    } else if (pickupFee > 0) {
      // Fallback 3: solo pickup_fee si existe
      calculatedAmount = pickupFee;
    }

    return {
      id: s.id,
      delivery_note_number: s.delivery_note_number,
      created_at: s.created_at,
      sender_name: senderName, // Quien envió al cliente
      origin: s.origin || 'Buenos Aires',
      destination: s.destination || 'Jujuy',
      package_quantity: s.package_quantity,
      weight_kg: s.weight_kg,
      declared_value: s.declared_value || 0,
      calculated_amount: calculatedAmount,
      quotation_id: s.quotation_id,
      pickup_fee: pickupFee,
    };
  });
  
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
  sender_name: string; // Quien envió al cliente (el cliente es el destinatario)
  origin: string;
  destination: string;
  package_quantity: number | null;
  weight_kg: number | null;
  calculated_amount: number;
  quotation_id: string | null;
  pickup_fee?: number;
}

export async function generateSettlement(
  clientId: number,
  selectedShipments: ShipmentForSettlement[],
  userId: string,
  userName: string
) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  // Cargar cotizaciones para obtener desglose de flete, seguro y retiro
  const shipmentsWithQuotations = await Promise.all(
    selectedShipments.map(async (s) => {
      let fleteAmount = 0;
      let seguroAmount = 0;
      let pickupAmount = s.pickup_fee || 0;
      
      if (s.quotation_id) {
        const { data: quotation } = await supabaseAdmin!
          .schema('mercure')
          .from('quotations')
          .select('base_price, insurance_cost, pickup_fee')
          .eq('id', s.quotation_id)
          .single();
        fleteAmount = quotation?.base_price || 0;
        seguroAmount = quotation?.insurance_cost || 0;
        pickupAmount = quotation?.pickup_fee || pickupAmount; // Usar el de cotización si existe
      }
      
      return { ...s, fleteAmount, seguroAmount, pickupAmount };
    })
  );
  
  const subtotalFlete = shipmentsWithQuotations.reduce((acc, s) => acc + s.fleteAmount, 0);
  const subtotalSeguro = shipmentsWithQuotations.reduce((acc, s) => acc + s.seguroAmount, 0);
  const subtotalRetiro = shipmentsWithQuotations.reduce((acc, s) => acc + s.pickupAmount, 0);
  const subtotal = subtotalFlete + subtotalSeguro + subtotalRetiro;
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
    recipient_name: s.sender_name, // Guardamos el remitente (quien envió al cliente)
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


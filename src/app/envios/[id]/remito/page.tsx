import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { RemitoPreviewClient } from "./remito-preview-client";

async function getShipmentData(id: number) {
  if (!supabaseAdmin) return null;
  
  const { data: shipment } = await supabaseAdmin
    .from('mercure_shipments')
    .select('*')
    .eq('id', id)
    .single();

  if (!shipment) return null;

  // Obtener sender, recipient y quotation por separado
  let sender = null;
  let recipient = null;
  let quotation = null;

  if (shipment.sender_id) {
    const { data } = await supabaseAdmin
      .from('mercure_entities')
      .select('id, legal_name, tax_id, address, phone, email')
      .eq('id', shipment.sender_id)
      .single();
    sender = data;
  }

  if (shipment.recipient_id) {
    const { data } = await supabaseAdmin
      .from('mercure_entities')
      .select('id, legal_name, tax_id, address, phone, email')
      .eq('id', shipment.recipient_id)
      .single();
    recipient = data;
  }

  // Cargar cotización asociada
  if (shipment.quotation_id) {
    const { data } = await supabaseAdmin
      .from('mercure_quotations')
      .select('base_price, insurance_cost, total_price, includes_iva')
      .eq('id', shipment.quotation_id)
      .single();
    quotation = data;
  }

  return {
    ...shipment,
    sender,
    recipient,
    quotation,
  };
}

export default async function RemitoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth("/envios");
  
  const { id } = await params;
  const shipmentId = parseInt(id);
  
  if (isNaN(shipmentId)) {
    notFound();
  }

  const shipment = await getShipmentData(shipmentId);
  
  if (!shipment) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white print:min-h-0">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="pt-12 print:pt-0">
        <RemitoPreviewClient shipment={shipment} />
      </main>
    </div>
  );
}


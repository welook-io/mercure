import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { EditShipmentForm } from "./edit-shipment-form";

async function getShipmentData(id: number) {
  const { data: shipment } = await supabase
    .from('mercure_shipments')
    .select('*, quotation_id, remito_image_url, cargo_image_url')
    .eq('id', id)
    .single();

  if (!shipment) return null;

  // Obtener sender y recipient por separado
  let sender = null;
  let recipient = null;

  if (shipment.sender_id) {
    const { data } = await supabase
      .from('mercure_entities')
      .select('id, legal_name, tax_id, address, phone, email')
      .eq('id', shipment.sender_id)
      .single();
    sender = data;
  }

  if (shipment.recipient_id) {
    const { data } = await supabase
      .from('mercure_entities')
      .select('id, legal_name, tax_id, address, phone, email')
      .eq('id', shipment.recipient_id)
      .single();
    recipient = data;
  }

  return {
    ...shipment,
    sender,
    recipient,
  };
}

async function getEntities() {
  const { data } = await supabase
    .from('mercure_entities')
    .select('id, legal_name, tax_id')
    .order('legal_name');
  return data || [];
}

export default async function EditarEnvioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth("/envios");
  
  const { id } = await params;
  const shipmentId = parseInt(id);
  
  if (isNaN(shipmentId)) {
    notFound();
  }

  const [shipment, entities] = await Promise.all([
    getShipmentData(shipmentId),
    getEntities()
  ]);
  
  if (!shipment) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4 max-w-3xl mx-auto">
          <EditShipmentForm shipment={shipment} entities={entities} />
        </div>
      </main>
    </div>
  );
}


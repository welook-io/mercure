import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { RemitoPreview } from "./remito-preview";

async function getShipmentData() {
  // Obtener el envío de HIPERPLACA para debug
  const { data: shipment } = await supabase
    .from('mercure_shipments')
    .select('*')
    .eq('id', 10)
    .single();

  // Obtener sender y recipient por separado
  let sender = null;
  let recipient = null;

  if (shipment?.sender_id) {
    const { data } = await supabase
      .from('mercure_entities')
      .select('id, legal_name, tax_id, address, phone, email')
      .eq('id', shipment.sender_id)
      .single();
    sender = data;
  }

  if (shipment?.recipient_id) {
    const { data } = await supabase
      .from('mercure_entities')
      .select('id, legal_name, tax_id, address, phone, email')
      .eq('id', shipment.recipient_id)
      .single();
    recipient = data;
  }

  if (!shipment) {
    // Fallback con datos mock si no encuentra
    return {
      id: 10,
      delivery_note_number: "R0005-00012470",
      status: "received",
      created_at: new Date().toISOString(),
      sender: {
        legal_name: "GRUPO EURO S.A.",
        tax_id: "30-71234567-8",
        address: "Av. Industrial 1234, CABA",
        phone: "011-4567-8901",
      },
      recipient: {
        legal_name: "HIPERPLACA S.R.L.",
        tax_id: "30-71625497-2",
        address: "ALTE BROWN Nº32",
        phone: "3884722086",
      },
      recipient_address: "ALTE BROWN Nº32, San Salvador de Jujuy",
      package_quantity: 1,
      weight_kg: 114.01,
      volume_m3: 0.2872,
      declared_value: 2015953.4,
      load_description: "1 pallet con perfiles de aluminio y accesorios para placards",
      paid_by: "destino",
      payment_terms: "contado",
    };
  }

  return {
    ...shipment,
    sender,
    recipient,
  };
}

export default async function RemitoDebugPage() {
  await requireAuth("/admin/remito-debug");
  
  const shipment = await getShipmentData();

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white print:min-h-0">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="pt-12 print:pt-0">
        <RemitoPreview shipment={shipment} />
      </main>
    </div>
  );
}


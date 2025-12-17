import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { MapPin } from "lucide-react";
import { DeliveryList } from "./delivery-list";

interface Shipment {
  id: number;
  delivery_note_number: string | null;
  status: string;
  package_quantity: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  declared_value: number | null;
  paid_by: string | null;
  payment_terms: string | null;
  created_at: string;
  recipient: { legal_name: string } | { legal_name: string }[] | null;
  sender: { legal_name: string } | { legal_name: string }[] | null;
  recipient_address: string | null;
}

async function getShipmentsReparto() {
  const { data } = await supabase
    .schema('mercure').from('shipments')
    .select(`
      id, delivery_note_number, status, package_quantity, weight_kg, volume_m3,
      declared_value, paid_by, payment_terms, created_at, recipient_address,
      sender:entities!sender_id(legal_name), 
      recipient:entities!recipient_id(legal_name)
    `)
    .eq('status', 'en_reparto')
    .order('created_at', { ascending: false });
  return (data || []) as Shipment[];
}

async function getShipmentsEntregados() {
  const { data } = await supabase
    .schema('mercure').from('shipments')
    .select(`
      id, delivery_note_number, status, package_quantity, weight_kg, volume_m3,
      declared_value, paid_by, payment_terms, created_at, recipient_address,
      sender:entities!sender_id(legal_name), 
      recipient:entities!recipient_id(legal_name)
    `)
    .in('status', ['entregada', 'delivered', 'no_entregada', 'rechazada'])
    .order('created_at', { ascending: false })
    .limit(50);
  return (data || []) as Shipment[];
}

export default async function RepartoPage() {
  await requireAuth("/reparto");

  const [enReparto, entregados] = await Promise.all([
    getShipmentsReparto(),
    getShipmentsEntregados()
  ]);

  const totalCobrar = enReparto
    .filter(s => s.payment_terms === 'contado')
    .reduce((acc, s) => acc + (s.declared_value || 0), 0);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-neutral-400" />
              <div>
                <h1 className="text-lg font-medium text-neutral-900">Reparto</h1>
                <p className="text-xs text-neutral-500">
                  {enReparto.length} en calle
                </p>
              </div>
            </div>
          </div>

          <DeliveryList 
            enReparto={enReparto} 
            entregados={entregados} 
            totalCobrar={totalCobrar} 
          />
        </div>
      </main>
    </div>
  );
}

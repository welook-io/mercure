import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { ShipmentList } from "./shipment-list";

async function getRecentShipments() {
  const { data } = await supabase
    .from('mercure_shipments')
    .select(`
      *,
      sender:mercure_entities!sender_id(legal_name),
      recipient:mercure_entities!recipient_id(legal_name),
      quotation:mercure_quotations!mercure_shipments_quotation_id_fkey(total_price)
    `)
    .in('status', ['received', 'in_warehouse', 'ingresada'])
    .is('trip_id', null)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export default async function RecepcionPage() {
  await requireAuth("/recepcion");

  const shipments = await getRecentShipments();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <div>
              <h1 className="text-lg font-medium text-neutral-900">Recepción</h1>
              <p className="text-xs text-neutral-500 md:hidden">
                {shipments.length} envío{shipments.length !== 1 ? 's' : ''} pendiente{shipments.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link href="/recepcion/nueva">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto">
                Nueva Recepción
              </Button>
            </Link>
          </div>

          {/* Proceso compacto - hidden on mobile */}
          <div className="hidden md:flex items-center gap-6 mb-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs">1</span> Control físico</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs">2</span> Comparar remito</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs">3</span> Sellar</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs">4</span> Registrar</span>
          </div>

          <ShipmentList shipments={shipments} />
        </div>
      </main>
    </div>
  );
}

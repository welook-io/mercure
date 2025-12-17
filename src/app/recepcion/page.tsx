import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { ShipmentList } from "./shipment-list";

async function getRecentShipments() {
  // Primero obtener los shipments sin relaciones
  const { data: shipments, error } = await supabaseAdmin!
    .schema('mercure')
    .from('shipments')
    .select('*')
    .in('status', ['received', 'in_warehouse', 'ingresada', 'pending', 'draft'])
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error("Error fetching shipments:", error);
    return [];
  }

  if (!shipments || shipments.length === 0) {
    return [];
  }

  // Obtener los IDs únicos de sender y recipient
  const senderIds = [...new Set(shipments.map(s => s.sender_id).filter(Boolean))];
  const recipientIds = [...new Set(shipments.map(s => s.recipient_id).filter(Boolean))];
  const quotationIds = [...new Set(shipments.map(s => s.quotation_id).filter(Boolean))];
  const allEntityIds = [...new Set([...senderIds, ...recipientIds])];

  // Obtener entidades
  const { data: entities } = await supabaseAdmin!
    .schema('mercure')
    .from('entities')
    .select('id, legal_name')
    .in('id', allEntityIds.length > 0 ? allEntityIds : [0]);

  // Obtener cotizaciones
  const { data: quotations } = await supabaseAdmin!
    .schema('mercure')
    .from('quotations')
    .select('id, total_price')
    .in('id', quotationIds.length > 0 ? quotationIds : [0]);

  const entitiesMap = new Map((entities || []).map(e => [e.id, e]));
  const quotationsMap = new Map((quotations || []).map(q => [q.id, q]));

  // Combinar datos
  return shipments.map(s => ({
    ...s,
    sender: s.sender_id ? entitiesMap.get(s.sender_id) || null : null,
    recipient: s.recipient_id ? entitiesMap.get(s.recipient_id) || null : null,
    quotation: s.quotation_id ? quotationsMap.get(s.quotation_id) || null : null,
  }));
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

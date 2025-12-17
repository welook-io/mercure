import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { KanbanBoard } from "./kanban-board";

interface ShipmentWithRelations {
  id: number;
  delivery_note_number: string | null;
  status: string;
  package_quantity: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  declared_value: number | null;
  recipient_address: string | null;
  created_at: string;
  updated_at: string;
  trip_id: number | null;
  quotation_id: string | null;
  sender: { legal_name: string } | null;
  recipient: { legal_name: string } | null;
  trip: { 
    id: number;
    origin: string;
    destination: string;
    status: string;
    departure_time: string | null;
  } | null;
  quotation: {
    total_price: number;
    base_price: number;
    insurance_cost: number | null;
  } | null;
}

// Helper para normalizar relaciones que pueden venir como array o objeto
function normalizeRelation<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0] || null;
  return rel;
}

async function getShipments(): Promise<ShipmentWithRelations[]> {
  // Obtener envíos de los últimos 30 días que no estén cancelados
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabaseAdmin!
    .schema('mercure').from('shipments')
    .select(`
      id, delivery_note_number, status, package_quantity, weight_kg, volume_m3,
      declared_value, recipient_address, created_at, updated_at, trip_id, quotation_id,
      sender:entities!sender_id(legal_name),
      recipient:entities!recipient_id(legal_name),
      trip:trips!trip_id(id, origin, destination, status, departure_time),
      quotation:quotations!quotation_id(total_price, base_price, insurance_cost)
    `)
    .neq('status', 'cancelled')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  // Normalizar relaciones que pueden venir como arrays
  return (data || []).map(item => ({
    ...item,
    sender: normalizeRelation(item.sender),
    recipient: normalizeRelation(item.recipient),
    trip: normalizeRelation(item.trip),
    quotation: normalizeRelation(item.quotation),
  })) as ShipmentWithRelations[];
}

export default async function KanbanPage() {
  await requireAuth("/operaciones/kanban");

  const shipments = await getShipments();

  // Agrupar por columnas del kanban
  const columns = {
    recepcion: shipments.filter(s => 
      ['received', 'in_warehouse', 'ingresada'].includes(s.status) && !s.trip_id
    ),
    enViaje: shipments.filter(s => 
      ['loaded', 'in_transit'].includes(s.status) || 
      (s.trip_id && s.trip?.status === 'in_transit')
    ),
    enDestino: shipments.filter(s => 
      s.trip?.status === 'arrived' && s.status !== 'delivered'
    ),
    entregado: shipments.filter(s => s.status === 'delivered'),
  };

  // Totales
  const totals = {
    recepcion: columns.recepcion.length,
    enViaje: columns.enViaje.length,
    enDestino: columns.enDestino.length,
    entregado: columns.entregado.length,
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-medium text-neutral-900">Kanban Operativo</h1>
              <p className="text-xs text-neutral-500">Flujo de mercadería en tiempo real · Últimos 30 días</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-neutral-600">{totals.recepcion + totals.enViaje + totals.enDestino} activos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-neutral-600">{totals.entregado} entregados</span>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <KanbanBoard columns={columns} />
        </div>
      </main>
    </div>
  );
}


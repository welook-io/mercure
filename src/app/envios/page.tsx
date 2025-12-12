import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { Truck, Plus } from "lucide-react";
import { ShipmentTransitList } from "./shipment-transit-list";
import Link from "next/link";

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
  trip_id: number | null;
  trip: { id: number; origin: string; destination: string; departure_date: string } | { id: number; origin: string; destination: string; departure_date: string }[] | null;
}

// Helper para extraer trip de relación
function getTrip(trip: Shipment['trip']): { id: number; origin: string; destination: string; departure_date: string } | null {
  if (!trip) return null;
  if (Array.isArray(trip)) return trip[0] || null;
  return trip;
}

// Estados que se consideran "en tránsito" (despachados)
const TRANSITO_STATUSES = ['en_transito', 'in_transit', 'loaded'];

async function getShipmentsEnTransito() {
  const { data } = await supabase
    .from('mercure_shipments')
    .select(`
      id, delivery_note_number, status, package_quantity, weight_kg, volume_m3,
      declared_value, paid_by, payment_terms, created_at, recipient_address, trip_id,
      sender:mercure_entities!sender_id(legal_name), 
      recipient:mercure_entities!recipient_id(legal_name),
      trip:mercure_trips(id, origin, destination, departure_date)
    `)
    .in('status', TRANSITO_STATUSES)
    .order('created_at', { ascending: false });
  return (data || []) as Shipment[];
}

// Agrupar por viaje
type TripData = { id: number; origin: string; destination: string; departure_date: string };

function groupByTrip(shipments: Shipment[]) {
  const groups: Record<string, { trip: TripData; shipments: Shipment[] }> = {};
  const sinViaje: Shipment[] = [];
  
  shipments.forEach(s => {
    const trip = getTrip(s.trip);
    if (trip) {
      const key = `trip-${trip.id}`;
      if (!groups[key]) {
        groups[key] = { trip, shipments: [] };
      }
      groups[key].shipments.push(s);
    } else {
      sinViaje.push(s);
    }
  });
  
  return { groups: Object.values(groups), sinViaje };
}

export default async function EnviosPage() {
  await requireAuth("/envios");

  const shipments = await getShipmentsEnTransito();
  const { groups, sinViaje } = groupByTrip(shipments);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-neutral-400" />
              <div>
                <h1 className="text-lg font-medium text-neutral-900">En Tránsito</h1>
                <p className="text-xs text-neutral-500">{shipments.length} envío{shipments.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <Link 
              href="/envios/nuevo"
              className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Cargar Remito Manual
            </Link>
          </div>

          <ShipmentTransitList groups={groups} sinViaje={sinViaje} />
        </div>
      </main>
    </div>
  );
}

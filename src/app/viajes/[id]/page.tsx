import { Navbar } from "@/components/layout/navbar";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { TripDetailClient } from "./trip-detail-client";

async function getTrip(id: number) {
  const { data } = await supabaseAdmin!
    .schema('mercure').from('trips')
    .select(`*, vehicle:vehicles(identifier, tractor_license_plate)`)
    .eq('id', id)
    .single();
  return data;
}

async function getTripShipments(tripId: number) {
  const { data } = await supabaseAdmin!
    .schema('mercure').from('shipments')
    .select(`
      *,
      sender:entities!shipments_sender_id_fkey(id, legal_name),
      recipient:entities!shipments_recipient_id_fkey(id, legal_name)
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  return data || [];
}

async function getEntities() {
  const { data } = await supabaseAdmin!
    .schema('mercure').from('entities')
    .select('id, legal_name, tax_id')
    .order('legal_name');
  return data || [];
}

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth("/viajes");
  const { id } = await params;
  const tripId = parseInt(id);
  
  const [trip, shipments, entities] = await Promise.all([
    getTrip(tripId),
    getTripShipments(tripId),
    getEntities(),
  ]);

  if (!trip) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <TripDetailClient trip={trip} shipments={shipments} entities={entities} />
      </main>
    </div>
  );
}



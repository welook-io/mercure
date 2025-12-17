import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { hasAccess } from "@/lib/auth";
import { SHIPMENT_STATUS_LABELS, TRIP_STATUS_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

async function getActiveTrips() {
  const { data } = await supabase
    .schema('mercure')
    .from('trips')
    .select(`*, vehicle:vehicles(identifier)`)
    .in('status', ['planned', 'loading', 'in_transit'])
    .order('departure_time', { ascending: true })
    .limit(10);
  return data || [];
}

async function getPendingShipments() {
  const { data } = await supabase
    .schema('mercure')
    .from('shipments')
    .select(`*, sender:entities!sender_id(legal_name), recipient:entities!recipient_id(legal_name)`)
    .in('status', ['received', 'in_warehouse'])
    .order('created_at', { ascending: false })
    .limit(15);
  return data || [];
}

async function getRecentDeliveries() {
  const { data } = await supabase
    .schema('mercure')
    .from('shipments')
    .select(`*, recipient:entities!recipient_id(legal_name)`)
    .eq('status', 'delivered')
    .order('updated_at', { ascending: false })
    .limit(10);
  return data || [];
}

function getStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case 'delivered': case 'completed': case 'arrived': return 'success';
    case 'in_transit': case 'loaded': return 'info';
    case 'received': case 'in_warehouse': case 'planned': case 'loading': return 'warning';
    case 'cancelled': return 'error';
    default: return 'default';
  }
}

export default async function Home() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  // Verificar si tiene acceso (rol asignado o super admin)
  const userHasAccess = await hasAccess(userId, userEmail);
  if (!userHasAccess) {
    redirect("/solicitar-acceso");
  }
  const [activeTrips, pendingShipments, recentDeliveries] = await Promise.all([
    getActiveTrips(),
    getPendingShipments(),
    getRecentDeliveries(),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-1">
            <h1 className="text-lg font-medium text-neutral-900">
              Dashboard
            </h1>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500">
              <span>{user?.firstName || "Usuario"}</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            </div>
          </div>

          {/* Quick stats inline - scrollable on mobile */}
          <div className="flex items-center gap-3 sm:gap-4 mb-4 text-xs sm:text-sm overflow-x-auto pb-2">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-neutral-500">Viajes:</span>
              <Badge variant="info">{activeTrips.length}</Badge>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-neutral-500">Pendientes:</span>
              <Badge variant="warning">{pendingShipments.length}</Badge>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-neutral-500">Entregados:</span>
              <Badge variant="success">{recentDeliveries.length}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Viajes Activos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Viajes Activos
                </h2>
                <Link href="/viajes" className="text-xs text-orange-500 hover:underline">
                  Ver todos →
                </Link>
              </div>
              <div className="border border-neutral-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">ID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Ruta</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Vehículo</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTrips.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-neutral-400 text-sm">Sin viajes activos</td></tr>
                      ) : (
                        activeTrips.map((trip: Record<string, unknown>) => (
                          <tr key={trip.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                            <td className="px-3 py-2 font-mono text-neutral-500">#{String(trip.id)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{String(trip.origin)} → {String(trip.destination)}</td>
                            <td className="px-3 py-2 text-neutral-600">{(trip.vehicle as { identifier: string })?.identifier || '-'}</td>
                            <td className="px-3 py-2">
                              <Badge variant={getStatusVariant(trip.status as string)}>
                                {TRIP_STATUS_LABELS[(trip.status as keyof typeof TRIP_STATUS_LABELS)]}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Envíos Pendientes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Pendientes de Despacho
                </h2>
                <Link href="/envios" className="text-xs text-orange-500 hover:underline">
                  Ver todos →
                </Link>
              </div>
              <div className="border border-neutral-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Bultos</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingShipments.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-neutral-400 text-sm">Sin envíos pendientes</td></tr>
                      ) : (
                        pendingShipments.map((s: Record<string, unknown>) => (
                          <tr key={s.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                            <td className="px-3 py-2 font-medium">{(s.delivery_note_number as string) || `#${s.id}`}</td>
                            <td className="px-3 py-2 text-neutral-600 truncate max-w-[120px]">{(s.recipient as { legal_name: string })?.legal_name || '-'}</td>
                            <td className="px-3 py-2 text-neutral-600">{(s.package_quantity as number) || '-'}</td>
                            <td className="px-3 py-2">
                              <Badge variant={getStatusVariant(s.status as string)}>
                                {SHIPMENT_STATUS_LABELS[(s.status as keyof typeof SHIPMENT_STATUS_LABELS)]}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Entregas Recientes */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Entregas Recientes
              </h2>
            </div>
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Descripción</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDeliveries.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-neutral-400 text-sm">Sin entregas recientes</td></tr>
                    ) : (
                      recentDeliveries.map((s: Record<string, unknown>) => (
                        <tr key={s.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                          <td className="px-3 py-2 font-medium">{(s.delivery_note_number as string) || `#${s.id}`}</td>
                          <td className="px-3 py-2 text-neutral-600">{(s.recipient as { legal_name: string })?.legal_name || '-'}</td>
                          <td className="px-3 py-2 text-neutral-500 truncate max-w-[200px]">{(s.load_description as string) || '-'}</td>
                          <td className="px-3 py-2">
                            <Badge variant="success">Entregado</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

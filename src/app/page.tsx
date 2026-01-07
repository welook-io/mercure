import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { hasAccess } from "@/lib/auth";
import { SHIPMENT_STATUS_LABELS, TRIP_STATUS_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Package, Truck, Users, FileText, Plus, ArrowRight } from "lucide-react";

async function getActiveTrips() {
  const { data } = await supabaseAdmin!
    .schema('mercure')
    .from('trips')
    .select(`*, vehicle:vehicles(identifier)`)
    .in('status', ['planned', 'loading', 'in_transit'])
    .order('departure_time', { ascending: true })
    .limit(10);
  return data || [];
}

async function getPendingShipments() {
  const { data } = await supabaseAdmin!
    .schema('mercure')
    .from('shipments')
    .select(`*, sender:entities!sender_id(legal_name), recipient:entities!recipient_id(legal_name)`)
    .in('status', ['received', 'in_warehouse'])
    .order('created_at', { ascending: false })
    .limit(15);
  return data || [];
}

async function getRecentDeliveries() {
  const { data } = await supabaseAdmin!
    .schema('mercure')
    .from('shipments')
    .select(`*, recipient:entities!recipient_id(legal_name)`)
    .eq('status', 'delivered')
    .order('updated_at', { ascending: false })
    .limit(10);
  return data || [];
}

async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [totalTrips, totalShipments, totalEntities, totalVehicles, todayShipments, monthShipments, inTransitShipments] = await Promise.all([
    // Total de viajes
    supabaseAdmin!.schema('mercure').from('trips').select('id', { count: 'exact', head: true }),
    // Total de envíos
    supabaseAdmin!.schema('mercure').from('shipments').select('id', { count: 'exact', head: true }),
    // Total de entidades
    supabaseAdmin!.schema('mercure').from('entities').select('id', { count: 'exact', head: true }),
    // Total de vehículos activos
    supabaseAdmin!.schema('mercure').from('vehicles').select('id', { count: 'exact', head: true }).eq('is_active', true),
    // Envíos de hoy
    supabaseAdmin!.schema('mercure').from('shipments').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    // Envíos del mes
    supabaseAdmin!.schema('mercure').from('shipments').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
    // Envíos en tránsito
    supabaseAdmin!.schema('mercure').from('shipments').select('id', { count: 'exact', head: true }).in('status', ['loaded', 'in_transit']),
  ]);

  return {
    totalTrips: totalTrips.count || 0,
    totalShipments: totalShipments.count || 0,
    totalEntities: totalEntities.count || 0,
    totalVehicles: totalVehicles.count || 0,
    todayShipments: todayShipments.count || 0,
    monthShipments: monthShipments.count || 0,
    inTransitShipments: inTransitShipments.count || 0,
  };
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
  const [activeTrips, pendingShipments, recentDeliveries, stats] = await Promise.all([
    getActiveTrips(),
    getPendingShipments(),
    getRecentDeliveries(),
    getDashboardStats(),
  ]);

  const hasActivity = activeTrips.length > 0 || pendingShipments.length > 0 || recentDeliveries.length > 0;

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

          {/* Estadísticas generales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="border border-neutral-200 rounded p-3 bg-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-500 uppercase tracking-wide">Envíos Hoy</span>
                <Package className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <div className="text-lg font-medium text-neutral-900">{stats.todayShipments}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{stats.monthShipments} este mes</div>
            </div>
            <div className="border border-neutral-200 rounded p-3 bg-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-500 uppercase tracking-wide">En Tránsito</span>
                <Truck className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <div className="text-lg font-medium text-neutral-900">{stats.inTransitShipments}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{activeTrips.length} viajes activos</div>
            </div>
            <div className="border border-neutral-200 rounded p-3 bg-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-500 uppercase tracking-wide">Pendientes</span>
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <div className="text-lg font-medium text-neutral-900">{pendingShipments.length}</div>
              <div className="text-xs text-neutral-500 mt-0.5">En depósito</div>
            </div>
            <div className="border border-neutral-200 rounded p-3 bg-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-500 uppercase tracking-wide">Entidades</span>
                <Users className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <div className="text-lg font-medium text-neutral-900">{stats.totalEntities}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{stats.totalVehicles} vehículos</div>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="mb-4 border border-neutral-200 rounded p-3 bg-neutral-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Accesos Rápidos</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Link href="/recepcion/nueva" className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:border-neutral-300 transition-colors">
                <Plus className="w-4 h-4 text-orange-500" />
                <span className="text-neutral-700">Nueva Recepción</span>
              </Link>
              <Link href="/envios/nuevo" className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:border-neutral-300 transition-colors">
                <Plus className="w-4 h-4 text-orange-500" />
                <span className="text-neutral-700">Nuevo Remito</span>
              </Link>
              <Link href="/viajes/nuevo" className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:border-neutral-300 transition-colors">
                <Plus className="w-4 h-4 text-orange-500" />
                <span className="text-neutral-700">Nuevo Viaje</span>
              </Link>
              <Link href="/entidades/nueva" className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:border-neutral-300 transition-colors">
                <Plus className="w-4 h-4 text-orange-500" />
                <span className="text-neutral-700">Nueva Entidad</span>
              </Link>
            </div>
          </div>

          {hasActivity ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Viajes Activos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                      Viajes Activos
                    </h2>
                    <Link href="/viajes" className="flex items-center gap-1 text-xs text-orange-500 hover:underline">
                      Ver todos <ArrowRight className="w-3 h-3" />
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
                                <td className="px-3 py-2">
                                  <Link href={`/viajes/${trip.id}`} className="font-mono text-neutral-500 hover:text-orange-500">
                                    #{String(trip.id)}
                                  </Link>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <Link href={`/viajes/${trip.id}`} className="hover:text-orange-500">
                                    {String(trip.origin)} → {String(trip.destination)}
                                  </Link>
                                </td>
                                <td className="px-3 py-2 text-neutral-600">
                                  <Link href={`/viajes/${trip.id}`} className="hover:text-orange-500">
                                    {(trip.vehicle as { identifier: string })?.identifier || '-'}
                                  </Link>
                                </td>
                                <td className="px-3 py-2">
                                  <Link href={`/viajes/${trip.id}`}>
                                    <Badge variant={getStatusVariant(trip.status as string)}>
                                      {TRIP_STATUS_LABELS[(trip.status as keyof typeof TRIP_STATUS_LABELS)]}
                                    </Badge>
                                  </Link>
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
                    <Link href="/envios" className="flex items-center gap-1 text-xs text-orange-500 hover:underline">
                      Ver todos <ArrowRight className="w-3 h-3" />
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
                                <td className="px-3 py-2">
                                  <Link href={`/envios/${s.id}/remito`} className="font-medium hover:text-orange-500">
                                    {(s.delivery_note_number as string) || `#${s.id}`}
                                  </Link>
                                </td>
                                <td className="px-3 py-2 text-neutral-600 truncate max-w-[120px]">
                                  <Link href={`/envios/${s.id}/remito`} className="hover:text-orange-500">
                                    {(s.recipient as { legal_name: string })?.legal_name || '-'}
                                  </Link>
                                </td>
                                <td className="px-3 py-2 text-neutral-600">
                                  <Link href={`/envios/${s.id}/remito`} className="hover:text-orange-500">
                                    {(s.package_quantity as number) || '-'}
                                  </Link>
                                </td>
                                <td className="px-3 py-2">
                                  <Link href={`/envios/${s.id}/remito`}>
                                    <Badge variant={getStatusVariant(s.status as string)}>
                                      {SHIPMENT_STATUS_LABELS[(s.status as keyof typeof SHIPMENT_STATUS_LABELS)]}
                                    </Badge>
                                  </Link>
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
              {recentDeliveries.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                      Entregas Recientes
                    </h2>
                    <Link href="/envios" className="flex items-center gap-1 text-xs text-orange-500 hover:underline">
                      Ver todos <ArrowRight className="w-3 h-3" />
                    </Link>
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
                          {recentDeliveries.map((s: Record<string, unknown>) => (
                            <tr key={s.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                              <td className="px-3 py-2">
                                <Link href={`/envios/${s.id}/remito`} className="font-medium hover:text-orange-500">
                                  {(s.delivery_note_number as string) || `#${s.id}`}
                                </Link>
                              </td>
                              <td className="px-3 py-2 text-neutral-600">
                                <Link href={`/envios/${s.id}/remito`} className="hover:text-orange-500">
                                  {(s.recipient as { legal_name: string })?.legal_name || '-'}
                                </Link>
                              </td>
                              <td className="px-3 py-2 text-neutral-500 truncate max-w-[200px]">
                                <Link href={`/envios/${s.id}/remito`} className="hover:text-orange-500">
                                  {(s.load_description as string) || '-'}
                                </Link>
                              </td>
                              <td className="px-3 py-2">
                                <Link href={`/envios/${s.id}/remito`}>
                                  <Badge variant="success">Entregado</Badge>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="border border-neutral-200 rounded p-6 bg-neutral-50">
              <div className="text-center max-w-md mx-auto">
                <div className="mb-4">
                  <Package className="w-12 h-12 text-neutral-400 mx-auto" />
                </div>
                <h3 className="text-sm font-medium text-neutral-900 mb-2">
                  Bienvenido a Mercure
                </h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Aún no hay actividad registrada. Empezá creando tu primera recepción o viaje.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/recepcion/nueva" className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">
                    Nueva Recepción
                  </Link>
                  <Link href="/envios/nuevo" className="px-3 py-1.5 text-xs bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors">
                    Nuevo Remito
                  </Link>
                  <Link href="/viajes/nuevo" className="px-3 py-1.5 text-xs border border-neutral-200 bg-white text-neutral-600 rounded hover:bg-neutral-50 transition-colors">
                    Nuevo Viaje
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

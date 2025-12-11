import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { TRIP_STATUS_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

async function getTrips() {
  const { data } = await supabase
    .from('mercure_trips')
    .select(`*, vehicle:mercure_vehicles(identifier, tractor_license_plate)`)
    .order('created_at', { ascending: false })
    .limit(100);
  return data || [];
}

function getStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case 'completed': case 'arrived': return 'success';
    case 'in_transit': return 'info';
    case 'loading': case 'planned': return 'warning';
    case 'cancelled': return 'error';
    default: return 'default';
  }
}

export default async function ViajesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const trips = await getTrips();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Viajes</h1>
            <Link href="/viajes/nuevo">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded">
                Nuevo Viaje
              </Button>
            </Link>
          </div>

          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Origen</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destino</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Vehículo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Patente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Salida</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Llegada</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.length === 0 ? (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-neutral-400">Sin viajes</td></tr>
                  ) : (
                    trips.map((t: Record<string, unknown>) => (
                      <tr key={t.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="px-3 py-2">
                          <Link href={`/viajes/${t.id}`} className="font-mono text-orange-500 hover:underline">#{String(t.id)}</Link>
                        </td>
                        <td className="px-3 py-2">{t.origin as string}</td>
                        <td className="px-3 py-2">{t.destination as string}</td>
                        <td className="px-3 py-2 text-neutral-600">{(t.vehicle as { identifier: string })?.identifier || '-'}</td>
                        <td className="px-3 py-2 font-mono text-neutral-500 text-xs">{(t.vehicle as { tractor_license_plate: string })?.tractor_license_plate || '-'}</td>
                        <td className="px-3 py-2 text-neutral-600 text-xs">
                          {t.departure_time ? new Date(t.departure_time as string).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </td>
                        <td className="px-3 py-2 text-neutral-600 text-xs">
                          {t.arrival_time ? new Date(t.arrival_time as string).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={getStatusVariant(t.status as string)}>
                            {TRIP_STATUS_LABELS[(t.status as keyof typeof TRIP_STATUS_LABELS)] || t.status as string}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-neutral-400 text-xs truncate max-w-[100px]">{(t.notes as string) || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

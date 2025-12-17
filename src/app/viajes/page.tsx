import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase";
import { TRIP_STATUS_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { Truck, Package } from "lucide-react";

async function getTrips() {
  const { data } = await supabaseAdmin!
    .schema('mercure')
    .from('trips')
    .select(`
      *, 
      vehicle:vehicles(identifier, tractor_license_plate),
      client:entities!trips_client_id_fkey(legal_name),
      supplier:entities!trips_supplier_id_fkey(legal_name)
    `)
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

function formatCurrency(value: number | null): string {
  if (!value) return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value);
}

export default async function ViajesPage() {
  await requireAuth("/viajes");

  const trips = await getTrips();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <h1 className="text-lg font-medium text-neutral-900">Viajes</h1>
            <Link href="/viajes/nuevo">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto">
                Nuevo Viaje
              </Button>
            </Link>
          </div>

          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Ruta</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Vehículo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Salida</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Precio</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-neutral-400">Sin viajes</td></tr>
                  ) : (
                    trips.map((t: Record<string, unknown>) => {
                      const isFTL = t.trip_type === 'camion_completo';
                      return (
                        <tr key={t.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                          <td className="px-3 py-2">
                            <Link href={`/viajes/${t.id}`} className="font-mono text-orange-500 hover:underline">#{String(t.id)}</Link>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {isFTL ? (
                                <Truck className="w-4 h-4 text-orange-500" />
                              ) : (
                                <Package className="w-4 h-4 text-blue-500" />
                              )}
                              <span className="text-xs text-neutral-600">
                                {isFTL ? 'FTL' : 'Cons.'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className="font-medium">{t.origin as string}</span>
                            <span className="text-neutral-400"> → </span>
                            <span>{t.destination as string}</span>
                          </td>
                          <td className="px-3 py-2 text-neutral-600 truncate max-w-[150px]">
                            {isFTL ? (
                              (t.client as { legal_name: string })?.legal_name || '-'
                            ) : (
                              <span className="text-neutral-400 text-xs">Varios</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-neutral-600 text-xs">
                              {(t.vehicle as { identifier: string })?.identifier || '-'}
                            </div>
                            <div className="font-mono text-neutral-400 text-[10px]">
                              {(t.vehicle as { tractor_license_plate: string })?.tractor_license_plate || ''}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-neutral-600 text-xs whitespace-nowrap">
                            {t.departure_time ? new Date(t.departure_time as string).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {isFTL ? formatCurrency(t.agreed_price as number) : '-'}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={getStatusVariant(t.status as string)}>
                              {TRIP_STATUS_LABELS[(t.status as keyof typeof TRIP_STATUS_LABELS)] || t.status as string}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
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

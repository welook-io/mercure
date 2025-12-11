import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { SHIPMENT_STATUS_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

async function getShipments() {
  const { data } = await supabase
    .from('mercure_shipments')
    .select(`*, sender:mercure_entities!sender_id(legal_name), recipient:mercure_entities!recipient_id(legal_name), trip:mercure_trips(id, origin, destination)`)
    .order('created_at', { ascending: false })
    .limit(100);
  return data || [];
}

function getStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case 'delivered': return 'success';
    case 'in_transit': case 'loaded': return 'info';
    case 'received': case 'in_warehouse': return 'warning';
    case 'cancelled': return 'error';
    default: return 'default';
  }
}

export default async function EnviosPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const shipments = await getShipments();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Envíos</h1>
            <Link href="/recepcion/nueva">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded">
                Nuevo Envío
              </Button>
            </Link>
          </div>

          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remitente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Bultos</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Peso</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Viaje</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.length === 0 ? (
                    <tr><td colSpan={10} className="px-3 py-8 text-center text-neutral-400">Sin envíos</td></tr>
                  ) : (
                    shipments.map((s: Record<string, unknown>) => (
                      <tr key={s.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="px-3 py-2 font-mono text-neutral-400">#{String(s.id)}</td>
                        <td className="px-3 py-2 font-medium">{(s.delivery_note_number as string) || '-'}</td>
                        <td className="px-3 py-2 text-neutral-600 truncate max-w-[120px]">{(s.sender as { legal_name: string })?.legal_name || '-'}</td>
                        <td className="px-3 py-2 text-neutral-600 truncate max-w-[120px]">{(s.recipient as { legal_name: string })?.legal_name || '-'}</td>
                        <td className="px-3 py-2 text-neutral-500 truncate max-w-[150px]">{(s.load_description as string) || '-'}</td>
                        <td className="px-3 py-2 text-neutral-600">{(s.package_quantity as number) || '-'}</td>
                        <td className="px-3 py-2 text-neutral-600">{s.weight_kg ? `${s.weight_kg}kg` : '-'}</td>
                        <td className="px-3 py-2">
                          {s.trip ? (
                            <Link href={`/viajes/${(s.trip as { id: number }).id}`} className="text-orange-500 hover:underline">
                              #{(s.trip as { id: number }).id}
                            </Link>
                          ) : <span className="text-neutral-300">-</span>}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={getStatusVariant(s.status as string)}>
                            {SHIPMENT_STATUS_LABELS[(s.status as keyof typeof SHIPMENT_STATUS_LABELS)] || s.status as string}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-neutral-400 text-xs">{new Date(s.created_at as string).toLocaleDateString('es-AR')}</td>
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

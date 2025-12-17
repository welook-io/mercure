import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { Warehouse } from "lucide-react";

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
}

// Helper para extraer legal_name de relación (puede ser objeto o array)
function getLegalName(entity: { legal_name: string } | { legal_name: string }[] | null): string {
  if (!entity) return '-';
  if (Array.isArray(entity)) return entity[0]?.legal_name || '-';
  return entity.legal_name || '-';
}

// Estados post-arribo
const ARRIBO_STATUSES = ['en_descarga', 'disponible'];

async function getShipmentsArribo() {
  const { data } = await supabaseAdmin!
    .schema('mercure').from('shipments')
    .select(`
      id, delivery_note_number, status, package_quantity, weight_kg, volume_m3,
      declared_value, paid_by, payment_terms, created_at, recipient_address, trip_id,
      sender:entities!sender_id(legal_name), 
      recipient:entities!recipient_id(legal_name)
    `)
    .in('status', ARRIBO_STATUSES)
    .order('created_at', { ascending: false });
  return (data || []) as Shipment[];
}

export default async function ArriboPage() {
  await requireAuth("/arribo");

  const shipments = await getShipmentsArribo();
  
  const enDescarga = shipments.filter(s => s.status === 'en_descarga');
  const disponibles = shipments.filter(s => s.status === 'disponible');

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-neutral-400" />
              <div>
                <h1 className="text-lg font-medium text-neutral-900">Arribo</h1>
                <p className="text-xs text-neutral-500">
                  {enDescarga.length} en descarga · {disponibles.length} disponibles
                </p>
              </div>
            </div>
          </div>

          {shipments.length === 0 ? (
            <div className="border border-neutral-200 rounded p-8 text-center">
              <p className="text-neutral-400 text-sm">No hay envíos en destino</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* En descarga */}
              {enDescarga.length > 0 && (
                <div className="border border-neutral-200 rounded overflow-hidden">
                  <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                    <span className="text-sm font-medium text-neutral-700">En Descarga / Clasificación</span>
                    <span className="text-xs text-neutral-500 ml-2">{enDescarga.length} envíos</span>
                  </div>
                  <ShipmentsTable shipments={enDescarga} />
                </div>
              )}

              {/* Disponibles */}
              {disponibles.length > 0 && (
                <div className="border border-neutral-200 rounded overflow-hidden">
                  <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                    <span className="text-sm font-medium text-neutral-700">Disponibles para reparto</span>
                    <span className="text-xs text-neutral-500 ml-2">{disponibles.length} envíos</span>
                  </div>
                  <ShipmentsTable shipments={disponibles} showCheckbox />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ShipmentsTable({ shipments, showCheckbox = false }: { shipments: Shipment[]; showCheckbox?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="border-b border-neutral-100">
            {showCheckbox && (
              <th className="px-3 py-2 text-left w-8">
                <input type="checkbox" className="rounded border-neutral-300" />
              </th>
            )}
            <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Dirección</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Bultos</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Kg</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">M³</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cobro</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map(s => {
            const isContado = s.payment_terms === 'contado';
            return (
              <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                {showCheckbox && (
                  <td className="px-3 py-2">
                    <input type="checkbox" className="rounded border-neutral-300" />
                  </td>
                )}
                <td className="px-3 py-2">
                  <span className="font-mono text-xs text-neutral-400">#{s.id}</span>
                  {s.delivery_note_number && (
                    <span className="ml-1 text-neutral-700">{s.delivery_note_number}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-neutral-700 truncate max-w-[120px]">
                  {getLegalName(s.recipient)}
                </td>
                <td className="px-3 py-2 text-neutral-500 text-xs truncate max-w-[150px]">
                  {s.recipient_address || '-'}
                </td>
                <td className="px-3 py-2 text-right text-neutral-600">
                  {s.package_quantity || '-'}
                </td>
                <td className="px-3 py-2 text-right text-neutral-600">
                  {s.weight_kg || '-'}
                </td>
                <td className="px-3 py-2 text-right text-neutral-600">
                  {s.volume_m3 || '-'}
                </td>
                <td className="px-3 py-2">
                  {isContado ? (
                    <span className="text-xs font-medium text-orange-600">Contra entrega</span>
                  ) : (
                    <span className="text-xs text-neutral-400">Cta Cte</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

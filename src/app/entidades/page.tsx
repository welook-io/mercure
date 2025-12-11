import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { ENTITY_TYPE_LABELS, PAYMENT_TERMS_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

async function getEntities() {
  const { data } = await supabase
    .from('mercure_entities')
    .select('*')
    .order('legal_name', { ascending: true });
  return data || [];
}

export default async function EntidadesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const entities = await getEntities();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Entidades</h1>
            <Link href="/entidades/nueva">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded">
                Nueva Entidad
              </Button>
            </Link>
          </div>

          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Razón Social</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">CUIT</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Condición</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Teléfono</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-400">Sin entidades</td></tr>
                  ) : (
                    entities.map((e: Record<string, unknown>) => (
                      <tr key={e.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="px-3 py-2 font-medium">{e.legal_name as string}</td>
                        <td className="px-3 py-2 font-mono text-neutral-500 text-xs">{(e.tax_id as string) || '-'}</td>
                        <td className="px-3 py-2">
                          {e.entity_type ? (
                            <Badge variant={e.entity_type === 'cliente' ? 'info' : e.entity_type === 'proveedor' ? 'warning' : 'default'}>
                              {ENTITY_TYPE_LABELS[(e.entity_type as string)] || e.entity_type as string}
                            </Badge>
                          ) : <span className="text-neutral-300">-</span>}
                        </td>
                        <td className="px-3 py-2">
                          {e.payment_terms ? (
                            <Badge variant={e.payment_terms === 'cuenta_corriente' ? 'success' : 'default'}>
                              {PAYMENT_TERMS_LABELS[(e.payment_terms as string)] || e.payment_terms as string}
                            </Badge>
                          ) : <span className="text-neutral-300">-</span>}
                        </td>
                        <td className="px-3 py-2 text-neutral-600 text-xs">{(e.email as string) || '-'}</td>
                        <td className="px-3 py-2 text-neutral-600 text-xs">{(e.phone as string) || '-'}</td>
                        <td className="px-3 py-2 text-neutral-400 text-xs truncate max-w-[150px]">{(e.address as string) || '-'}</td>
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

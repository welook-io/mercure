import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase";
import { ENTITY_TYPE_LABELS, PAYMENT_TERMS_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";

interface EntityWithTerms {
  id: number;
  legal_name: string;
  tax_id: string | null;
  entity_type: string | null;
  payment_terms: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  commercial_terms: {
    tariff_modifier: number;
    insurance_rate: number;
    credit_days: number;
  } | null;
}

async function getEntities(): Promise<EntityWithTerms[]> {
  if (!supabaseAdmin) return [];
  
  const { data } = await supabaseAdmin
    .schema('mercure')
    .from('entities')
    .select(`
      id, legal_name, tax_id, entity_type, payment_terms, email, phone, address,
      commercial_terms:client_commercial_terms(tariff_modifier, insurance_rate, credit_days)
    `)
    .order('legal_name', { ascending: true });
  
  // Normalizar commercial_terms (puede venir como array)
  return (data || []).map(e => ({
    ...e,
    commercial_terms: Array.isArray(e.commercial_terms) 
      ? e.commercial_terms[0] || null 
      : e.commercial_terms
  }));
}

export default async function EntidadesPage() {
  await requireAuth("/entidades");

  const entities = await getEntities();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <h1 className="text-lg font-medium text-neutral-900">Entidades</h1>
            <Link href="/entidades/nueva">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto">
                Nueva Entidad
              </Button>
            </Link>
          </div>

          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Razón Social</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">CUIT</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Condición</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Acuerdo Comercial</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Teléfono</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-neutral-400">Sin entidades</td></tr>
                  ) : (
                    entities.map((e) => {
                      const terms = e.commercial_terms;
                      const hasTerms = !!terms;
                      const modifier = terms ? Number(terms.tariff_modifier) : 0;
                      const insuranceRate = terms ? Number(terms.insurance_rate) * 100 : 0;
                      
                      return (
                        <tr key={e.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                          <td className="px-3 py-2">
                            <div className="font-medium">{e.legal_name}</div>
                            {e.email && <div className="text-[10px] text-neutral-400">{e.email}</div>}
                          </td>
                          <td className="px-3 py-2 font-mono text-neutral-500 text-xs">{e.tax_id || '-'}</td>
                          <td className="px-3 py-2">
                            {e.entity_type ? (
                              <Badge variant={e.entity_type === 'cliente' ? 'info' : e.entity_type === 'proveedor' ? 'warning' : 'default'}>
                                {ENTITY_TYPE_LABELS[e.entity_type] || e.entity_type}
                              </Badge>
                            ) : <span className="text-neutral-300">-</span>}
                          </td>
                          <td className="px-3 py-2">
                            {e.payment_terms ? (
                              <Badge variant={e.payment_terms === 'cuenta_corriente' ? 'success' : 'default'}>
                                {PAYMENT_TERMS_LABELS[e.payment_terms] || e.payment_terms}
                              </Badge>
                            ) : <span className="text-neutral-300">-</span>}
                          </td>
                          <td className="px-3 py-2">
                            {hasTerms ? (
                              <div className="text-xs space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <span className={`font-medium ${modifier < 0 ? 'text-green-600' : modifier > 0 ? 'text-red-600' : 'text-neutral-600'}`}>
                                    {modifier > 0 ? '+' : ''}{modifier}%
                                  </span>
                                  <span className="text-neutral-400">tarifa</span>
                                </div>
                                <div className="text-neutral-500">
                                  Seguro: {insuranceRate.toFixed(1)}%
                                </div>
                              </div>
                            ) : (
                              <span className="text-neutral-300 text-xs">Sin acuerdo</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-neutral-600 text-xs">{e.phone || '-'}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link 
                                href={`/entidades/${e.id}`}
                                className="text-xs text-orange-500 hover:text-orange-600 hover:underline"
                              >
                                Editar
                              </Link>
                              <Link 
                                href={`/acuerdos/${e.id}`}
                                className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                                title={hasTerms ? 'Editar acuerdo' : 'Crear acuerdo'}
                              >
                                {hasTerms ? '✎ Acuerdo' : '+ Acuerdo'}
                              </Link>
                            </div>
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

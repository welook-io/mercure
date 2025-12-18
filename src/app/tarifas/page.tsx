import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { TariffTable } from "./tariff-table";
import { SpecialTariffsTable } from "./special-tariffs-table";

async function getTariffs() {
  const { data } = await supabaseAdmin!
    .schema('mercure')
    .from('tariffs')
    .select('*')
    .order('origin', { ascending: true });
  return data || [];
}

async function getInsuranceRates() {
  const { data } = await supabaseAdmin!
    .schema('mercure')
    .from('insurance_rates')
    .select('*')
    .order('valid_from', { ascending: false })
    .limit(5);
  return data || [];
}

async function getQuotations() {
  const { data } = await supabaseAdmin!
    .schema('mercure')
    .from('quotations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  return data || [];
}

async function getRegularClients() {
  const { data } = await supabaseAdmin!
    .schema('mercure')
    .from('entities')
    .select('id, legal_name, tax_id')
    .or('client_type.eq.regular,payment_terms.eq.cuenta_corriente')
    .order('legal_name', { ascending: true });
  return data || [];
}

export default async function TarifasPage() {
  await requireAuth("/tarifas");

  const [tariffs, insuranceRates, quotations, regularClients] = await Promise.all([
    getTariffs(),
    getInsuranceRates(),
    getQuotations(),
    getRegularClients()
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <h1 className="text-lg font-medium text-neutral-900">Tarifas</h1>
            <div className="flex gap-2">
              <Link href="/tarifas/nueva">
                <Button variant="outline" className="h-8 px-3 text-sm border-neutral-200 hover:bg-neutral-50 rounded">
                  Nueva Tarifa
                </Button>
              </Link>
              <Link href="/recepcion/nueva?mode=cotizar">
                <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded">
                  Cotizar
                </Button>
              </Link>
            </div>
          </div>

          {/* Tarifas Especiales por Cliente */}
          <SpecialTariffsTable initialEntities={regularClients as any} />

          {/* Tarifas Base (colapsable) */}
          <details className="mb-6 group">
            <summary className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2 cursor-pointer list-none flex items-center gap-2 hover:text-neutral-700">
              <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Tarifas Base (Lista de Precios)
              <span className="text-neutral-400 font-normal normal-case hidden sm:inline">(click en precio para editar)</span>
            </summary>
            <div className="mt-2">
              <TariffTable initialTariffs={tariffs as any} />
            </div>
          </details>

          {/* Seguro y Cotizaciones en dos columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Seguro */}
            <div>
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Tasas de Seguro</h2>
              <div className="border border-neutral-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[350px]">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tasa ‰</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">IVA</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Desde</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insuranceRates.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-neutral-400">Sin tasas</td></tr>
                      ) : (
                        insuranceRates.map((r: Record<string, unknown>) => {
                          const isActive = !r.valid_until || new Date(r.valid_until as string) >= new Date();
                          return (
                            <tr key={r.id as number} className="border-b border-neutral-100 last:border-0">
                              <td className="px-3 py-2 font-medium">{String(r.rate_per_thousand)}‰</td>
                              <td className="px-3 py-2 text-neutral-600">{r.includes_iva ? 'Sí' : 'No'}</td>
                              <td className="px-3 py-2 text-neutral-400 text-xs">{new Date(r.valid_from as string).toLocaleDateString('es-AR')}</td>
                              <td className="px-3 py-2"><Badge variant={isActive ? 'success' : 'error'}>{isActive ? 'Vigente' : 'Vencida'}</Badge></td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Cotizaciones */}
            <div>
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Cotizaciones Recientes</h2>
              <div className="border border-neutral-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[350px]">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cliente</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Ruta</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Total</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.length === 0 ? (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-neutral-400">Sin cotizaciones</td></tr>
                      ) : (
                        quotations.slice(0, 8).map((q: Record<string, unknown>) => (
                          <tr key={q.id as string} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                            <td className="px-3 py-2 truncate max-w-[100px]">{(q.customer_name as string) || '-'}</td>
                            <td className="px-3 py-2 text-neutral-600 text-xs whitespace-nowrap">{String(q.origin)} → {String(q.destination)}</td>
                            <td className="px-3 py-2 font-medium">${Number(q.total_price).toLocaleString('es-AR')}</td>
                            <td className="px-3 py-2">
                              <Badge variant={q.status === 'accepted' ? 'success' : q.status === 'rejected' || q.status === 'expired' ? 'error' : 'warning'}>
                                {q.status === 'pending' ? 'Pend' : q.status === 'accepted' ? 'OK' : q.status === 'rejected' ? 'Rech' : q.status as string}
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
        </div>
      </main>
    </div>
  );
}

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

async function getTariffs() {
  const { data } = await supabase
    .from('mercure_tariffs')
    .select('*')
    .order('origin', { ascending: true });
  return data || [];
}

async function getInsuranceRates() {
  const { data } = await supabase
    .from('mercure_insurance_rates')
    .select('*')
    .order('valid_from', { ascending: false })
    .limit(5);
  return data || [];
}

async function getQuotations() {
  const { data } = await supabase
    .from('mercure_quotations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  return data || [];
}

export default async function TarifasPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [tariffs, insuranceRates, quotations] = await Promise.all([
    getTariffs(),
    getInsuranceRates(),
    getQuotations()
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Tarifas</h1>
            <div className="flex gap-2">
              <Link href="/tarifas/nueva">
                <Button variant="outline" className="h-8 px-3 text-sm border-neutral-200 hover:bg-neutral-50 rounded">
                  Nueva Tarifa
                </Button>
              </Link>
              <Link href="/tarifas/cotizar">
                <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded">
                  Cotizar
                </Button>
              </Link>
            </div>
          </div>

          {/* Tarifas */}
          <div className="mb-6">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Tarifas Vigentes</h2>
            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Origen</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destino</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Peso</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Precio</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">$/kg</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Vigencia</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tariffs.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-neutral-400">Sin tarifas</td></tr>
                  ) : (
                    tariffs.map((t: Record<string, unknown>) => {
                      const isActive = !t.valid_until || new Date(t.valid_until as string) >= new Date();
                      return (
                        <tr key={t.id as number} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                          <td className="px-3 py-2 font-medium">{t.origin as string}</td>
                          <td className="px-3 py-2">{t.destination as string}</td>
                          <td className="px-3 py-2">
                            <Badge variant={t.tariff_type === 'express' ? 'warning' : 'default'}>
                              {t.tariff_type as string || 'std'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-neutral-600 text-xs">
                            {String(t.weight_from_kg || '0')}-{String(t.weight_to_kg || '∞')}kg
                          </td>
                          <td className="px-3 py-2 font-medium">${Number(t.price).toLocaleString('es-AR')}</td>
                          <td className="px-3 py-2 text-neutral-600">{t.price_per_kg ? `$${t.price_per_kg}` : '-'}</td>
                          <td className="px-3 py-2 text-neutral-400 text-xs">{new Date(t.valid_from as string).toLocaleDateString('es-AR')}</td>
                          <td className="px-3 py-2">
                            <Badge variant={isActive ? 'success' : 'error'}>{isActive ? 'Vigente' : 'Vencida'}</Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seguro y Cotizaciones en dos columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Seguro */}
            <div>
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Tasas de Seguro</h2>
              <div className="border border-neutral-200 rounded overflow-hidden">
                <table className="w-full text-sm">
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

            {/* Cotizaciones */}
            <div>
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Cotizaciones Recientes</h2>
              <div className="border border-neutral-200 rounded overflow-hidden">
                <table className="w-full text-sm">
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
                          <td className="px-3 py-2 text-neutral-600 text-xs">{String(q.origin)} → {String(q.destination)}</td>
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
      </main>
    </div>
  );
}

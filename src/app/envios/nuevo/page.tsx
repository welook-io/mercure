import { Navbar } from "@/components/layout/navbar";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NuevoRemitoForm } from "./nuevo-remito-form";

async function getEntities() {
  const { data } = await supabaseAdmin!
    .schema('mercure').from('entities')
    .select('id, legal_name, tax_id, payment_terms')
    .order('legal_name');
  return data || [];
}

export default async function NuevoRemitoPage() {
  await requireAuth("/envios/nuevo");
  const entities = await getEntities();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4 max-w-3xl mx-auto">
          <div className="border-b border-neutral-200 pb-3 mb-6">
            <h1 className="text-lg font-medium text-neutral-900">Cargar Remito Manual</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Cargar remitos para armar cuentas corrientes y facturar
            </p>
          </div>
          <NuevoRemitoForm entities={entities} />
        </div>
      </main>
    </div>
  );
}


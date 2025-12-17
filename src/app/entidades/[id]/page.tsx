import { Navbar } from "@/components/layout/navbar";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { EditEntityForm } from "./edit-entity-form";

interface CommercialTerms {
  id: number;
  tariff_modifier: number;
  insurance_rate: number;
  credit_days: number;
}

async function getEntity(id: number) {
  if (!supabaseAdmin) return null;
  
  const { data } = await supabaseAdmin
    .schema('mercure').from('entities')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

async function getCommercialTerms(entityId: number): Promise<CommercialTerms | null> {
  if (!supabaseAdmin) return null;
  
  const { data } = await supabaseAdmin
    .schema('mercure').from('client_commercial_terms')
    .select('id, tariff_modifier, insurance_rate, credit_days')
    .eq('entity_id', entityId)
    .single();
  return data;
}

export default async function EditEntityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth("/entidades");
  const { id } = await params;
  const entityId = parseInt(id);
  
  const [entity, commercialTerms] = await Promise.all([
    getEntity(entityId),
    getCommercialTerms(entityId),
  ]);

  if (!entity) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <div className="border-b border-neutral-200 pb-3 mb-6">
            <h1 className="text-lg font-medium text-neutral-900">Editar Entidad</h1>
            <p className="text-sm text-neutral-500 mt-1">{entity.legal_name}</p>
          </div>
          <EditEntityForm entity={entity} commercialTerms={commercialTerms} />
        </div>
      </main>
    </div>
  );
}


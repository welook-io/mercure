"use server";

import { supabaseAdmin } from "@/lib/supabase";

export async function updateEntity(id: number, data: {
  legal_name: string;
  tax_id: string | null;
  entity_type: string | null;
  payment_terms: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  contact_name: string | null;
  destination: string | null;
  client_type: string | null;
}) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  const { error } = await supabaseAdmin
    .schema('mercure')
    .from('entities')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  
  if (error) throw error;
  return { success: true };
}

export async function upsertCommercialTerms(entityId: number, terms: {
  credit_terms: string | null;
  credit_days: number | null;
  payment_method: string | null;
  payment_notes: string | null;
  tariff_type: string | null;
  tariff_modifier: number | null;
  tariff_notes: string | null;
  insurance_rate: number | null;
  insurance_notes: string | null;
  sales_rep: string | null;
  is_active: boolean;
}, existingTermsId: number | null) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  if (existingTermsId) {
    // Update existing
    const { error } = await supabaseAdmin
      .schema('mercure')
      .from('client_commercial_terms')
      .update({
        ...terms,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingTermsId);
    
    if (error) throw error;
  } else {
    // Insert new
    const { error } = await supabaseAdmin
      .schema('mercure')
      .from('client_commercial_terms')
      .insert({
        entity_id: entityId,
        ...terms
      });
    
    if (error) throw error;
  }
  
  return { success: true };
}

export async function deleteCommercialTerms(entityId: number) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  const { error } = await supabaseAdmin
    .schema('mercure')
    .from('client_commercial_terms')
    .delete()
    .eq('entity_id', entityId);
  
  if (error) throw error;
  return { success: true };
}



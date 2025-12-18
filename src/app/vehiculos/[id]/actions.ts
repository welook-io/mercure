"use server";

import { supabaseAdmin } from "@/lib/supabase";

export async function updateVehicle(id: number, data: {
  identifier: string;
  brand: string | null;
  model: string | null;
  vehicle_type: string | null;
  year: number | null;
  tractor_license_plate: string | null;
  trailer_license_plate: string | null;
  pallet_capacity: number | null;
  weight_capacity_kg: number | null;
  current_km: number | null;
  purchase_date: string | null;
  purchase_km: number | null;
  purchase_condition: string | null;
  is_active: boolean;
  notes: string | null;
}) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  const { error } = await supabaseAdmin
    .schema('mercure')
    .from('vehicles')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  
  if (error) throw error;
  return { success: true };
}

export async function createVehicleEvent(data: {
  vehicle_id: number;
  event_type: string;
  event_date: string;
  km_at_event: number | null;
  cost: number | null;
  provider: string | null;
  description: string | null;
  next_date: string | null;
  next_km: number | null;
}) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  const { data: result, error } = await supabaseAdmin
    .schema('mercure')
    .from('vehicle_events')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

export async function deleteVehicleEvent(eventId: number) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  const { error } = await supabaseAdmin
    .schema('mercure')
    .from('vehicle_events')
    .delete()
    .eq('id', eventId);
  
  if (error) throw error;
  return { success: true };
}



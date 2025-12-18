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
  capacity_m3?: number | null;
  has_forklift?: boolean;
  has_hydraulic_ramp?: boolean;
  has_thermal_control?: boolean;
  current_km: number | null;
  purchase_date: string | null;
  purchase_km: number | null;
  purchase_condition: string | null;
  is_active: boolean;
  notes: string | null;
}) {
  if (!supabaseAdmin) throw new Error("No admin client");
  
  // Map weight_capacity_kg to max_weight_kg for DB
  const dbData = {
    identifier: data.identifier,
    brand: data.brand,
    model: data.model,
    vehicle_type: data.vehicle_type,
    year: data.year,
    tractor_license_plate: data.tractor_license_plate,
    trailer_license_plate: data.trailer_license_plate,
    pallet_capacity: data.pallet_capacity,
    max_weight_kg: data.weight_capacity_kg,
    capacity_m3: data.capacity_m3,
    has_forklift: data.has_forklift,
    has_hydraulic_ramp: data.has_hydraulic_ramp,
    has_thermal_control: data.has_thermal_control,
    current_km: data.current_km,
    purchase_date: data.purchase_date,
    purchase_km: data.purchase_km,
    purchase_condition: data.purchase_condition,
    is_active: data.is_active,
    notes: data.notes,
    updated_at: new Date().toISOString()
  };
  
  const { error } = await supabaseAdmin
    .schema('mercure')
    .from('vehicles')
    .update(dbData)
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



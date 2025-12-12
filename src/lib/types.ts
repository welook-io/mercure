// Tipos para el schema mercure

export interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
  entity_type: 'cliente' | 'proveedor' | 'ambos' | null;
  payment_terms: 'contado' | 'cuenta_corriente' | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: number;
  identifier: string;
  tractor_license_plate: string | null;
  trailer_license_plate: string | null;
  pallet_capacity: number | null;
  weight_capacity_kg: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: number;
  origin: string;
  destination: string;
  status: 'planned' | 'loading' | 'in_transit' | 'arrived' | 'completed' | 'cancelled';
  departure_time: string | null;
  arrival_time: string | null;
  driver_id: string | null;
  vehicle_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  vehicle?: Vehicle;
  driver?: Profile;
  shipments?: Shipment[];
}

export interface Shipment {
  id: number;
  delivery_note_number: string | null;
  status: 'received' | 'in_warehouse' | 'loaded' | 'in_transit' | 'delivered' | 'cancelled';
  sender_id: number;
  recipient_id: number;
  trip_id: number | null;
  load_description: string | null;
  package_quantity: number | null;
  weight_kg: number | null;
  declared_value: number | null;
  notes: string | null;
  quotation_id: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  sender?: Entity;
  recipient?: Entity;
  trip?: Trip;
}

export interface Tariff {
  id: number;
  origin: string;
  destination: string;
  weight_from_kg: number | null;
  weight_to_kg: number | null;
  price: number;
  price_per_kg: number | null;
  tariff_type: 'standard' | 'express' | 'special' | null;
  volumetric_price: number | null;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceRate {
  id: number;
  rate_per_thousand: number;
  includes_iva: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quotation_number: string | null;
  customer_name: string | null;
  customer_cuit: string | null;
  origin: string;
  destination: string;
  weight_kg: number;
  volume_m3: number | null;
  volumetric_weight_kg: number | null;
  chargeable_weight_kg: number;
  base_price: number;
  insurance_value: number | null;
  insurance_cost: number | null;
  total_price: number;
  includes_iva: boolean;
  tariff_id: number | null;
  entity_id: number | null;
  shipment_id: number | null;
  created_by_user_id: string | null;
  created_by_agent_id: string | null;
  valid_until: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'auxiliar_deposito' | 'administrativo' | 'chofer' | 'atencion_cliente' | 'contabilidad' | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface MercureEvent {
  id: number;
  event_type: string;
  metadata: Record<string, unknown> | null;
  shipment_id: number | null;
  trip_id: number | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Status labels para UI
export const SHIPMENT_STATUS_LABELS: Record<Shipment['status'], string> = {
  received: 'Recibido',
  in_warehouse: 'En depósito',
  loaded: 'Cargado',
  in_transit: 'En tránsito',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const TRIP_STATUS_LABELS: Record<Trip['status'], string> = {
  planned: 'Planificado',
  loading: 'Cargando',
  in_transit: 'En tránsito',
  arrived: 'Arribado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  cliente: 'Cliente',
  proveedor: 'Proveedor',
  ambos: 'Cliente y Proveedor',
};

export const PAYMENT_TERMS_LABELS: Record<string, string> = {
  contado: 'Contado',
  cuenta_corriente: 'Cuenta Corriente',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  auxiliar_deposito: 'Auxiliar de Depósito',
  administrativo: 'Administrativo',
  chofer: 'Chofer',
  atencion_cliente: 'Atención al Cliente',
  contabilidad: 'Contabilidad',
};

export const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  configured: 'Configurado',
};

export const TARIFF_TYPE_LABELS: Record<string, string> = {
  standard: 'Estándar',
  express: 'Express',
  special: 'Especial',
};

export const CREDIT_TERMS_LABELS: Record<string, string> = {
  contado: 'Contado',
  cuenta_corriente: 'Cuenta Corriente',
  credito: 'Crédito',
};

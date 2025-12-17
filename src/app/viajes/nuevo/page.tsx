"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { Loader2, Save, ArrowLeft, Truck, Package, MapPin, Building2, Calendar, DollarSign, Weight, Box } from "lucide-react";
import Link from "next/link";

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
}

interface Vehicle {
  id: number;
  identifier: string;
  tractor_license_plate: string | null;
}

type TripType = 'consolidado' | 'camion_completo';

const ORIGINS = [
  'Buenos Aires',
  'Córdoba',
  'Mendoza',
  'Rosario',
  'Tucumán',
  'Salta',
];

const DESTINATIONS = [
  'Jujuy',
  'Buenos Aires',
  'Córdoba',
  'Mendoza',
  'Tucumán',
  'Salta',
];

export default function NuevoViajePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [tripType, setTripType] = useState<TripType>('camion_completo');
  
  const [formData, setFormData] = useState({
    origin: 'Buenos Aires',
    destination: 'Jujuy',
    vehicle_id: '',
    departure_time: '',
    // Campos para camión completo
    client_id: '',
    supplier_id: '',
    agreed_price: '',
    pickup_address: '',
    delivery_address: '',
    cargo_description: '',
    weight_kg: '',
    volume_m3: '',
    notes: '',
  });

  useEffect(() => {
    async function loadData() {
      const [entitiesRes, vehiclesRes] = await Promise.all([
        supabaseAdmin.schema('mercure').from('entities').select('id, legal_name, tax_id').order('legal_name'),
        supabaseAdmin.schema('mercure').from('vehicles').select('id, identifier, tractor_license_plate').order('identifier'),
      ]);
      setEntities(entitiesRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const tripData: Record<string, unknown> = {
        trip_type: tripType,
        origin: formData.origin,
        destination: formData.destination,
        status: 'planned',
        vehicle_id: formData.vehicle_id ? parseInt(formData.vehicle_id) : null,
        departure_time: formData.departure_time || null,
        notes: formData.notes || null,
      };

      // Campos adicionales para camión completo
      if (tripType === 'camion_completo') {
        tripData.client_id = formData.client_id ? parseInt(formData.client_id) : null;
        tripData.supplier_id = formData.supplier_id ? parseInt(formData.supplier_id) : null;
        tripData.agreed_price = formData.agreed_price ? parseFloat(formData.agreed_price) : null;
        tripData.pickup_address = formData.pickup_address || null;
        tripData.delivery_address = formData.delivery_address || null;
        tripData.cargo_description = formData.cargo_description || null;
        tripData.weight_kg = formData.weight_kg ? parseFloat(formData.weight_kg) : null;
        tripData.volume_m3 = formData.volume_m3 ? parseFloat(formData.volume_m3) : null;
      }

      const { data: newTrip, error: insertError } = await supabase
        .schema('mercure').from('trips')
        .insert(tripData)
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      router.push(`/viajes/${newTrip.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear viaje');
    } finally {
      setSaving(false);
    }
  };

  const selectedClient = entities.find(e => e.id === parseInt(formData.client_id));
  const selectedSupplier = entities.find(e => e.id === parseInt(formData.supplier_id));

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pt-12 flex items-center justify-center h-[80vh]">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-3 mb-4">
            <Link href="/viajes">
              <button className="h-8 w-8 flex items-center justify-center hover:bg-neutral-100 rounded">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <Truck className="w-5 h-5 text-neutral-400" />
            <h1 className="text-lg font-medium text-neutral-900">Nuevo Viaje</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                {error}
              </div>
            )}

            {/* Tipo de Viaje */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTripType('camion_completo')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  tripType === 'camion_completo'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Truck className={`w-6 h-6 mb-2 ${tripType === 'camion_completo' ? 'text-orange-500' : 'text-neutral-400'}`} />
                <div className="font-medium text-sm">Camión Completo</div>
                <div className="text-xs text-neutral-500 mt-1">Flete dedicado de un proveedor a un cliente</div>
              </button>
              
              <button
                type="button"
                onClick={() => setTripType('consolidado')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  tripType === 'consolidado'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Package className={`w-6 h-6 mb-2 ${tripType === 'consolidado' ? 'text-orange-500' : 'text-neutral-400'}`} />
                <div className="font-medium text-sm">Consolidado</div>
                <div className="text-xs text-neutral-500 mt-1">Múltiples envíos en un viaje</div>
              </button>
            </div>

            {/* Ruta y Vehículo */}
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Ruta y Vehículo
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Origen
                  </label>
                  <select
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  >
                    {ORIGINS.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Destino
                  </label>
                  <select
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  >
                    {DESTINATIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Vehículo
                  </label>
                  <select
                    name="vehicle_id"
                    value={formData.vehicle_id}
                    onChange={handleChange}
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  >
                    <option value="">Seleccionar...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.identifier} {v.tractor_license_plate ? `(${v.tractor_license_plate})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Fecha/Hora Salida
                  </label>
                  <input
                    type="datetime-local"
                    name="departure_time"
                    value={formData.departure_time}
                    onChange={handleChange}
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Campos específicos de Camión Completo */}
            {tripType === 'camion_completo' && (
              <>
                {/* Cliente y Proveedor */}
                <div className="border border-neutral-200 rounded overflow-hidden">
                  <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-2">
                      <Building2 className="w-3 h-3" /> Cliente y Proveedor
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                        Cliente (quien paga) *
                      </label>
                      <select
                        name="client_id"
                        value={formData.client_id}
                        onChange={handleChange}
                        required
                        className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                      >
                        <option value="">Seleccionar cliente...</option>
                        {entities.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.legal_name} {e.tax_id ? `(${e.tax_id})` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedClient && (
                        <p className="text-[10px] text-neutral-400 mt-1">
                          CUIT: {selectedClient.tax_id || 'Sin CUIT'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                        Proveedor (origen de carga)
                      </label>
                      <select
                        name="supplier_id"
                        value={formData.supplier_id}
                        onChange={handleChange}
                        className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                      >
                        <option value="">Seleccionar proveedor...</option>
                        {entities.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.legal_name} {e.tax_id ? `(${e.tax_id})` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedSupplier && (
                        <p className="text-[10px] text-neutral-400 mt-1">
                          CUIT: {selectedSupplier.tax_id || 'Sin CUIT'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                        Dirección de Retiro
                      </label>
                      <input
                        type="text"
                        name="pickup_address"
                        value={formData.pickup_address}
                        onChange={handleChange}
                        placeholder="Dirección donde se retira la carga"
                        className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                        Dirección de Entrega
                      </label>
                      <input
                        type="text"
                        name="delivery_address"
                        value={formData.delivery_address}
                        onChange={handleChange}
                        placeholder="Dirección donde se entrega"
                        className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Carga y Precio */}
                <div className="border border-neutral-200 rounded overflow-hidden">
                  <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                    <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-2">
                      <Box className="w-3 h-3" /> Carga y Precio
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                        Descripción de la Carga
                      </label>
                      <textarea
                        name="cargo_description"
                        value={formData.cargo_description}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Ej: Pallets de mercadería, electrodomésticos, etc."
                        className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-500 uppercase mb-1 flex items-center gap-1">
                        <Weight className="w-3 h-3" /> Peso (kg)
                      </label>
                      <input
                        type="number"
                        name="weight_kg"
                        value={formData.weight_kg}
                        onChange={handleChange}
                        step="0.1"
                        placeholder="0"
                        className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                        Volumen (m³)
                      </label>
                      <input
                        type="number"
                        name="volume_m3"
                        value={formData.volume_m3}
                        onChange={handleChange}
                        step="0.1"
                        placeholder="0"
                        className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-500 uppercase mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Precio Acordado *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                        <input
                          type="number"
                          name="agreed_price"
                          value={formData.agreed_price}
                          onChange={handleChange}
                          required
                          step="0.01"
                          placeholder="0.00"
                          className="w-full h-10 pl-7 pr-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Notas / Observaciones
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Observaciones adicionales..."
                className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0 resize-none"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <Link
                href="/viajes"
                className="flex-1 h-10 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium rounded flex items-center justify-center gap-2 text-sm"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-300 text-white font-medium rounded flex items-center justify-center gap-2 text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Crear Viaje
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}


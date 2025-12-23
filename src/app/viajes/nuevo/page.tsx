"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Loader2, Save, ArrowLeft, Truck, Package, MapPin, Building2, Calendar, DollarSign, Weight, Box, User, Home } from "lucide-react";
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
  brand?: string;
  model?: string;
  image_url?: string | null;
}

type TripType = 'consolidado' | 'camion_completo' | 'ultima_milla';

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

// Depósitos para última milla
const DEPOSITOS = [
  'Depósito Jujuy',
  'Depósito Salta',
];

export default function NuevoViajePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get('tipo');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Determinar tipo inicial basado en parámetro URL
  const getInitialType = (): TripType => {
    if (tipoParam === 'ultima_milla') return 'ultima_milla';
    if (tipoParam === 'viaje') return 'consolidado';
    return 'consolidado';
  };
  
  const [tripType, setTripType] = useState<TripType>(getInitialType());
  
  const [formData, setFormData] = useState({
    origin: 'Buenos Aires',
    destination: 'Jujuy',
    vehicle_id: 'tercerizado_logisa',
    departure_time: '',
    // Conductor/Guía
    driver_name: '',
    driver_dni: '',
    driver_phone: '',
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
      try {
        const response = await fetch('/api/viajes/data');
        const data = await response.json();
        setEntities(data.entities || []);
        setVehicles(data.vehicles || []);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Actualizar origen cuando cambia el tipo de viaje
  useEffect(() => {
    if (tripType === 'ultima_milla') {
      setFormData(prev => ({
        ...prev,
        origin: 'Depósito Jujuy',
        destination: '', // Sin destino fijo para última milla
        vehicle_id: '', // Requiere seleccionar vehículo
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        origin: 'Buenos Aires',
        destination: 'Jujuy',
        vehicle_id: 'tercerizado_logisa',
      }));
    }
  }, [tripType]);

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
      const response = await fetch('/api/viajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_type: tripType,
          ...formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear viaje');
      }

      router.push(`/viajes/${result.trip.id}`);
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
            {tripType === 'ultima_milla' ? (
              <Home className="w-5 h-5 text-purple-500" />
            ) : (
              <Truck className="w-5 h-5 text-neutral-400" />
            )}
            <h1 className="text-lg font-medium text-neutral-900">
              {tripType === 'ultima_milla' ? 'Nueva Última Milla' : 'Nuevo Viaje'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                {error}
              </div>
            )}

            {/* Tipo de Viaje */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTripType('consolidado')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  tripType === 'consolidado'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Package className={`w-6 h-6 mb-2 ${tripType === 'consolidado' ? 'text-blue-500' : 'text-neutral-400'}`} />
                <div className="font-medium text-sm">Viaje</div>
                <div className="text-xs text-neutral-500 mt-1">Recepción → Destino</div>
              </button>
              
              <button
                type="button"
                onClick={() => setTripType('ultima_milla')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  tripType === 'ultima_milla'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <Home className={`w-6 h-6 mb-2 ${tripType === 'ultima_milla' ? 'text-purple-500' : 'text-neutral-400'}`} />
                <div className="font-medium text-sm">Última Milla</div>
                <div className="text-xs text-neutral-500 mt-1">Destino → Cliente</div>
              </button>

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
                <div className="text-xs text-neutral-500 mt-1">FTL dedicado</div>
              </button>
            </div>

            {/* Ruta y Vehículo */}
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className={`${tripType === 'ultima_milla' ? 'bg-purple-50 border-purple-200' : 'bg-neutral-50'} px-3 py-2 border-b border-neutral-200`}>
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> {tripType === 'ultima_milla' ? 'Depósito y Vehículo' : 'Ruta y Vehículo'}
                </span>
              </div>
              <div className="p-4">
                {tripType === 'ultima_milla' ? (
                  /* ÚLTIMA MILLA: Depósito origen + Vehículo con foto */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                          Depósito de Salida
                        </label>
                        <select
                          name="origin"
                          value={formData.origin}
                          onChange={handleChange}
                          className="w-full h-10 px-3 border border-purple-200 rounded text-sm focus:border-purple-400 focus:ring-0 bg-purple-50"
                        >
                          {DEPOSITOS.map(d => (
                            <option key={d} value={d}>{d}</option>
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

                    {/* Vehículo con foto para última milla */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                        Vehículo de Reparto
                      </label>
                      <div className="flex gap-4">
                        <select
                          name="vehicle_id"
                          value={formData.vehicle_id}
                          onChange={handleChange}
                          className="flex-1 h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                        >
                          <option value="">Seleccionar vehículo...</option>
                          {vehicles.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.identifier} {v.tractor_license_plate ? `(${v.tractor_license_plate})` : ''} {v.brand ? `- ${v.brand}` : ''}
                            </option>
                          ))}
                        </select>
                        {/* Foto del vehículo seleccionado */}
                        {formData.vehicle_id && formData.vehicle_id !== 'tercerizado_logisa' && (() => {
                          const selectedVehicle = vehicles.find(v => v.id === parseInt(formData.vehicle_id));
                          if (selectedVehicle?.image_url) {
                            return (
                              <div className="w-24 h-24 rounded-lg overflow-hidden border border-neutral-200 shrink-0">
                                <img 
                                  src={selectedVehicle.image_url} 
                                  alt={selectedVehicle.identifier}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    {/* Info de ruta */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-900">Ruta de Entregas</p>
                          <p className="text-xs text-purple-600 mt-1">Las direcciones se calcularán según las guías asignadas</p>
                        </div>
                        <button
                          type="button"
                          disabled
                          className="h-9 px-4 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded flex items-center gap-2"
                          title="Próximamente"
                        >
                          <MapPin className="w-4 h-4" />
                          Calcular Ruta Inteligente
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VIAJE NORMAL: Origen, Destino, Vehículo, Fecha */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <option value="tercerizado_logisa">🚛 Tercerizado Logisa</option>
                        <option value="" disabled>── Flota propia ──</option>
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
                )}
              </div>
            </div>

            {/* Conductor / Guía */}
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-orange-50 px-3 py-2 border-b border-orange-200">
                <span className="text-xs font-medium text-orange-700 uppercase tracking-wide flex items-center gap-2">
                  <User className="w-3 h-3" /> Conductor / Guía
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Nombre del Conductor
                  </label>
                  <input
                    type="text"
                    name="driver_name"
                    value={formData.driver_name}
                    onChange={handleChange}
                    placeholder="Nombre completo"
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    DNI
                  </label>
                  <input
                    type="text"
                    name="driver_dni"
                    value={formData.driver_dni}
                    onChange={handleChange}
                    placeholder="12.345.678"
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    name="driver_phone"
                    value={formData.driver_phone}
                    onChange={handleChange}
                    placeholder="011-1234-5678"
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


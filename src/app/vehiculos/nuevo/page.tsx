"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Truck, Save } from "lucide-react";
import Link from "next/link";

const VEHICLE_TYPES = [
  "UTILITARIO", "FURGON", "FURGON TERMICO", "CHASIS C/CABINA",
  "SEMIRREMOLQUE", "CAMION", "CAMIONETA", "TRACTOR", "AUTO", "MOTO",
];

const BRANDS = [
  "RENAULT", "MERCEDES BENZ", "IVECO", "SCANIA", "VOLVO", "VOLKSWAGEN",
  "FORD", "FIAT", "PEUGEOT", "CITROEN", "TOYOTA", "CHEVROLET",
  "HONDA", "HYUNDAI", "KIA", "NISSAN", "OTRO",
];

export default function NuevoVehiculoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    identifier: "",
    brand: "",
    model: "",
    vehicle_type: "",
    year: new Date().getFullYear(),
    tractor_license_plate: "",
    trailer_license_plate: "",
    pallet_capacity: "",
    weight_capacity_kg: "",
    purchase_date: "",
    purchase_km: "",
    purchase_condition: "used",
    is_active: true,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .schema('mercure').from('vehicles')
        .insert({
          identifier: formData.identifier.toUpperCase(),
          brand: formData.brand || null,
          model: formData.model || null,
          vehicle_type: formData.vehicle_type || null,
          year: formData.year || null,
          tractor_license_plate: formData.tractor_license_plate.toUpperCase() || formData.identifier.toUpperCase(),
          trailer_license_plate: formData.trailer_license_plate.toUpperCase() || null,
          pallet_capacity: formData.pallet_capacity ? parseInt(formData.pallet_capacity) : null,
          weight_capacity_kg: formData.weight_capacity_kg ? parseFloat(formData.weight_capacity_kg) : null,
          purchase_date: formData.purchase_date || null,
          purchase_km: formData.purchase_km ? parseInt(formData.purchase_km) : null,
          purchase_condition: formData.purchase_condition,
          is_active: formData.is_active,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        await supabase.schema('mercure').from('vehicle_events').insert({
          vehicle_id: data.id,
          event_type: 'compra',
          event_date: formData.purchase_date || new Date().toISOString().split('T')[0],
          km_at_event: formData.purchase_km ? parseInt(formData.purchase_km) : 0,
          description: "Adquisición - " + (formData.purchase_condition === 'new' ? '0km' : 'Usado'),
        });
      }
      router.push("/vehiculos/" + data?.id);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al crear vehículo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-3 mb-4">
            <Link href="/vehiculos">
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Truck className="w-5 h-5 text-neutral-400" />
            <h1 className="text-lg font-medium text-neutral-900">Nuevo Vehículo</h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium">Datos del Vehículo</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Dominio *</label>
                  <Input required value={formData.identifier} onChange={(e) => setFormData({ ...formData, identifier: e.target.value.toUpperCase() })} placeholder="ABC123" className="h-8 text-sm font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Marca</label>
                  <select value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="h-8 w-full text-sm border border-neutral-200 rounded px-2">
                    <option value="">Seleccionar...</option>
                    {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Modelo</label>
                  <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="Ej: Kangoo, 710..." className="h-8 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Tipo</label>
                  <select value={formData.vehicle_type} onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })} className="h-8 w-full text-sm border border-neutral-200 rounded px-2">
                    <option value="">Seleccionar...</option>
                    {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Año</label>
                  <Input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium">Patentes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Patente Principal</label>
                  <Input value={formData.tractor_license_plate} onChange={(e) => setFormData({ ...formData, tractor_license_plate: e.target.value.toUpperCase() })} className="h-8 text-sm font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Patente Acoplado</label>
                  <Input value={formData.trailer_license_plate} onChange={(e) => setFormData({ ...formData, trailer_license_plate: e.target.value.toUpperCase() })} className="h-8 text-sm font-mono uppercase" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium">Capacidad</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Pallets</label>
                  <Input type="number" value={formData.pallet_capacity} onChange={(e) => setFormData({ ...formData, pallet_capacity: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Peso Máx (kg)</label>
                  <Input type="number" value={formData.weight_capacity_kg} onChange={(e) => setFormData({ ...formData, weight_capacity_kg: e.target.value })} className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-xs uppercase tracking-wide text-neutral-500 font-medium">Adquisición</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Fecha</label>
                  <Input type="date" value={formData.purchase_date} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Km al Adquirir</label>
                  <Input type="number" value={formData.purchase_km} onChange={(e) => setFormData({ ...formData, purchase_km: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Condición</label>
                  <select value={formData.purchase_condition} onChange={(e) => setFormData({ ...formData, purchase_condition: e.target.value })} className="h-8 w-full text-sm border border-neutral-200 rounded px-2">
                    <option value="new">0km</option>
                    <option value="used">Usado</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Notas</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full text-sm border border-neutral-200 rounded px-2 py-1.5 resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="rounded" />
                <label htmlFor="is_active" className="text-sm">Activo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Link href="/vehiculos"><Button type="button" variant="outline" className="h-8 px-3 text-sm">Cancelar</Button></Link>
              <Button type="submit" disabled={loading} className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white">
                <Save className="w-4 h-4 mr-1" />{loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

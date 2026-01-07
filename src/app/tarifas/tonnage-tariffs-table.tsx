"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface TonnageRate {
  id: number;
  origin: string;
  destination: string;
  delivery_type: string;
  tonnage_from_kg: number;
  tonnage_to_kg: number | null;
  price_per_kg: number;
  includes_iva: boolean;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

export function TonnageTariffsTable() {
  const [rates, setRates] = useState<TonnageRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const [form, setForm] = useState({
    origin: 'Buenos Aires',
    destination: 'Jujuy',
    delivery_type: 'deposito',
    tonnage_from_kg: '1001',
    tonnage_to_kg: '',
    price_per_kg: '',
    includes_iva: false,
  });

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tariffs?type=tonnage');
      const { data } = await res.json();
      setRates(data || []);
    } catch (err) {
      console.error('Error fetching tonnage rates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/tariffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tonnage',
          origin: form.origin,
          destination: form.destination,
          delivery_type: form.delivery_type,
          tonnage_from_kg: parseInt(form.tonnage_from_kg),
          tonnage_to_kg: form.tonnage_to_kg ? parseInt(form.tonnage_to_kg) : null,
          price_per_kg: parseFloat(form.price_per_kg),
          includes_iva: form.includes_iva,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({
          origin: 'Buenos Aires',
          destination: 'Jujuy',
          delivery_type: 'deposito',
          tonnage_from_kg: '1001',
          tonnage_to_kg: '',
          price_per_kg: '',
          includes_iva: false,
        });
        fetchRates();
      }
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteRate = async (id: number) => {
    if (!confirm('¿Eliminar esta tarifa por tonelaje?')) return;

    try {
      await fetch(`/api/tariffs?type=tonnage&id=${id}`, { method: 'DELETE' });
      fetchRates();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  // Agrupar por ruta
  const groupedByRoute = rates.reduce((acc, r) => {
    const key = `${r.origin} → ${r.destination}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(r);
    return acc;
  }, {} as Record<string, TonnageRate[]>);

  return (
    <div className="mb-6">
      <div
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-2">
          Tarifas por Tonelaje (+1000kg)
          <Badge variant="default" className="text-[10px] px-1.5 py-0">
            {rates.length}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
          )}
        </h2>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            setShowForm(true);
            setExpanded(true);
          }}
          variant="ghost"
          className="h-7 px-2 text-xs text-neutral-500 hover:text-neutral-700"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nueva
        </Button>
      </div>

      {expanded && (
        <div className="mt-2">
          {showForm && (
            <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 rounded">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Origen *</Label>
                    <select
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value })}
                      className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                      required
                    >
                      <option value="Buenos Aires">Buenos Aires</option>
                      <option value="Rosario">Rosario</option>
                      <option value="Córdoba">Córdoba</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Destino *</Label>
                    <select
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                      required
                    >
                      <option value="Jujuy">Jujuy</option>
                      <option value="Salta">Salta</option>
                      <option value="Tucumán">Tucumán</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Tipo Entrega</Label>
                    <select
                      value={form.delivery_type}
                      onChange={(e) => setForm({ ...form, delivery_type: e.target.value })}
                      className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                    >
                      <option value="deposito">Depósito</option>
                      <option value="domicilio">Domicilio</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Precio/kg *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.price_per_kg}
                      onChange={(e) => setForm({ ...form, price_per_kg: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="245.81"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Desde (kg) *</Label>
                    <Input
                      type="number"
                      value={form.tonnage_from_kg}
                      onChange={(e) => setForm({ ...form, tonnage_from_kg: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="1001"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Hasta (kg)</Label>
                    <Input
                      type="number"
                      value={form.tonnage_to_kg}
                      onChange={(e) => setForm({ ...form, tonnage_to_kg: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="5000 (vacío = sin límite)"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 h-8 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.includes_iva}
                        onChange={(e) => setForm({ ...form, includes_iva: e.target.checked })}
                        className="w-4 h-4 text-orange-500 border-neutral-300 rounded"
                      />
                      <span className="text-xs text-neutral-600">Incluye IVA</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                    className="h-8 px-3 text-sm"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="p-4 text-center text-neutral-400 text-sm">Cargando...</div>
          ) : rates.length === 0 ? (
            <div className="p-4 text-center text-neutral-400 text-sm border border-neutral-200 rounded">
              Sin tarifas por tonelaje configuradas
            </div>
          ) : (
            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Ruta</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Entrega</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Rango Kg</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">$/kg</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">IVA</th>
                    <th className="px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-3 py-2 text-neutral-700">
                        {r.origin} → {r.destination}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={r.delivery_type === 'domicilio' ? 'warning' : 'default'} className="text-xs">
                          {r.delivery_type === 'domicilio' ? 'Domicilio' : 'Depósito'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {r.tonnage_from_kg.toLocaleString('es-AR')} - {r.tonnage_to_kg ? r.tonnage_to_kg.toLocaleString('es-AR') : '+'}
                      </td>
                      <td className="px-3 py-2 font-mono font-medium">
                        ${Number(r.price_per_kg).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        {r.includes_iva ? (
                          <Badge variant="info" className="text-xs">+IVA</Badge>
                        ) : (
                          <span className="text-neutral-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => deleteRate(r.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}









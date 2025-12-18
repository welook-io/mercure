"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X, Check, ChevronDown, ChevronUp } from "lucide-react";

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
}

interface SpecialTariff {
  id: number;
  entity_id: number;
  name: string;
  description: string | null;
  condition_type: string;
  condition_values: Record<string, any>;
  pricing_type: string;
  pricing_values: Record<string, any>;
  origin: string | null;
  destination: string | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  priority: number;
  notes: string | null;
  entity?: Entity;
}

const CONDITION_TYPES = [
  { value: 'cualquiera', label: 'Cualquier envío' },
  { value: 'peso_minimo', label: 'Peso mínimo' },
  { value: 'volumen_minimo', label: 'Volumen mínimo' },
  { value: 'bultos_minimo', label: 'Bultos mínimos' },
  { value: 'tipo_carga', label: 'Tipo de carga' },
];

const PRICING_TYPES = [
  { value: 'fijo', label: 'Precio fijo' },
  { value: 'por_kg', label: 'Precio por kg' },
  { value: 'descuento_porcentaje', label: 'Descuento %' },
  { value: 'descuento_monto', label: 'Descuento $' },
];

export function SpecialTariffsTable({ initialEntities }: { initialEntities: Entity[] }) {
  const [tariffs, setTariffs] = useState<SpecialTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);
  
  // Form state
  const [form, setForm] = useState({
    entity_id: '',
    name: '',
    description: '',
    condition_type: 'cualquiera',
    condition_value: '',
    pricing_type: 'fijo',
    pricing_value: '',
    origin: '',
    destination: '',
    priority: '0',
    notes: '',
  });

  // Fetch tariffs
  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/special-tariffs');
      const { data } = await res.json();
      setTariffs(data || []);
    } catch (err) {
      console.error('Error fetching tariffs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Construir condition_values según el tipo
      let condition_values: Record<string, any> = {};
      if (form.condition_type === 'peso_minimo' && form.condition_value) {
        condition_values = { peso_minimo_kg: parseFloat(form.condition_value) };
      } else if (form.condition_type === 'volumen_minimo' && form.condition_value) {
        condition_values = { volumen_minimo_m3: parseFloat(form.condition_value) };
      } else if (form.condition_type === 'bultos_minimo' && form.condition_value) {
        condition_values = { bultos_minimo: parseInt(form.condition_value) };
      } else if (form.condition_type === 'tipo_carga' && form.condition_value) {
        condition_values = { tipo: form.condition_value };
      }

      // Construir pricing_values según el tipo
      let pricing_values: Record<string, any> = {};
      if (form.pricing_type === 'fijo' && form.pricing_value) {
        pricing_values = { precio: parseFloat(form.pricing_value) };
      } else if (form.pricing_type === 'por_kg' && form.pricing_value) {
        pricing_values = { precio_kg: parseFloat(form.pricing_value) };
      } else if (form.pricing_type === 'descuento_porcentaje' && form.pricing_value) {
        pricing_values = { porcentaje: -Math.abs(parseFloat(form.pricing_value)) };
      } else if (form.pricing_type === 'descuento_monto' && form.pricing_value) {
        pricing_values = { monto: -Math.abs(parseFloat(form.pricing_value)) };
      }

      const res = await fetch('/api/special-tariffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: parseInt(form.entity_id),
          name: form.name,
          description: form.description || null,
          condition_type: form.condition_type,
          condition_values,
          pricing_type: form.pricing_type,
          pricing_values,
          origin: form.origin || null,
          destination: form.destination || null,
          priority: parseInt(form.priority) || 0,
          notes: form.notes || null,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({
          entity_id: '',
          name: '',
          description: '',
          condition_type: 'cualquiera',
          condition_value: '',
          pricing_type: 'fijo',
          pricing_value: '',
          origin: '',
          destination: '',
          priority: '0',
          notes: '',
        });
        fetchTariffs();
      }
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tariff: SpecialTariff) => {
    try {
      await fetch('/api/special-tariffs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tariff.id,
          is_active: !tariff.is_active,
        }),
      });
      fetchTariffs();
    } catch (err) {
      console.error('Error toggling:', err);
    }
  };

  const deleteTariff = async (id: number) => {
    if (!confirm('¿Eliminar esta tarifa especial?')) return;
    
    try {
      await fetch(`/api/special-tariffs?id=${id}`, { method: 'DELETE' });
      fetchTariffs();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const formatCondition = (tariff: SpecialTariff) => {
    const cv = tariff.condition_values || {};
    switch (tariff.condition_type) {
      case 'peso_minimo':
        return `≥ ${cv.peso_minimo_kg}kg`;
      case 'volumen_minimo':
        return `≥ ${cv.volumen_minimo_m3}m³`;
      case 'bultos_minimo':
        return `≥ ${cv.bultos_minimo} bultos`;
      case 'tipo_carga':
        return cv.tipo || 'Especial';
      case 'cualquiera':
        return 'Siempre';
      default:
        return '-';
    }
  };

  const formatPricing = (tariff: SpecialTariff) => {
    const pv = tariff.pricing_values || {};
    switch (tariff.pricing_type) {
      case 'fijo':
        return `$${(pv.precio || 0).toLocaleString('es-AR')}`;
      case 'por_kg':
        return `$${pv.precio_kg}/kg`;
      case 'descuento_porcentaje':
        return `${pv.porcentaje}%`;
      case 'descuento_monto':
        return `-$${Math.abs(pv.monto || 0).toLocaleString('es-AR')}`;
      default:
        return '-';
    }
  };

  // Agrupar por cliente
  const groupedByEntity = tariffs.reduce((acc, t) => {
    const key = t.entity_id;
    if (!acc[key]) {
      acc[key] = {
        entity: t.entity,
        tariffs: [],
      };
    }
    acc[key].tariffs.push(t);
    return acc;
  }, {} as Record<number, { entity?: Entity; tariffs: SpecialTariff[] }>);

  return (
    <div className="mb-6">
      {/* Header colapsable */}
      <div 
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-2">
          Tarifas Especiales por Cliente
          <Badge variant="default" className="text-[10px] px-1.5 py-0">
            {tariffs.length}
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
          {/* Formulario de nueva tarifa */}
          {showForm && (
            <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 rounded">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Cliente *</Label>
                    <select
                      value={form.entity_id}
                      onChange={(e) => setForm({ ...form, entity_id: e.target.value })}
                      className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {initialEntities.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.legal_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Nombre del arreglo *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="Ej: Pallets Completos"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Prioridad</Label>
                    <Input
                      type="number"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Condición</Label>
                    <select
                      value={form.condition_type}
                      onChange={(e) => setForm({ ...form, condition_type: e.target.value, condition_value: '' })}
                      className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                    >
                      {CONDITION_TYPES.map((ct) => (
                        <option key={ct.value} value={ct.value}>
                          {ct.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">
                      {form.condition_type === 'peso_minimo' && 'Peso mínimo (kg)'}
                      {form.condition_type === 'volumen_minimo' && 'Volumen mínimo (m³)'}
                      {form.condition_type === 'bultos_minimo' && 'Bultos mínimos'}
                      {form.condition_type === 'tipo_carga' && 'Tipo de carga'}
                      {form.condition_type === 'cualquiera' && 'Sin condición'}
                    </Label>
                    <Input
                      type={form.condition_type === 'tipo_carga' ? 'text' : 'number'}
                      value={form.condition_value}
                      onChange={(e) => setForm({ ...form, condition_value: e.target.value })}
                      className="h-8 text-sm"
                      placeholder={form.condition_type === 'cualquiera' ? '-' : 'Valor'}
                      disabled={form.condition_type === 'cualquiera'}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Tipo de precio</Label>
                    <select
                      value={form.pricing_type}
                      onChange={(e) => setForm({ ...form, pricing_type: e.target.value, pricing_value: '' })}
                      className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                    >
                      {PRICING_TYPES.map((pt) => (
                        <option key={pt.value} value={pt.value}>
                          {pt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">
                      {form.pricing_type === 'fijo' && 'Precio ($)'}
                      {form.pricing_type === 'por_kg' && 'Precio/kg ($)'}
                      {form.pricing_type === 'descuento_porcentaje' && 'Descuento (%)'}
                      {form.pricing_type === 'descuento_monto' && 'Descuento ($)'}
                    </Label>
                    <Input
                      type="number"
                      value={form.pricing_value}
                      onChange={(e) => setForm({ ...form, pricing_value: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Origen (opcional)</Label>
                    <Input
                      value={form.origin}
                      onChange={(e) => setForm({ ...form, origin: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="Buenos Aires"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Destino (opcional)</Label>
                    <Input
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="Jujuy"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Notas</Label>
                    <Input
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="h-8 text-sm"
                      placeholder="Notas internas..."
                    />
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

          {/* Tabla de tarifas */}
          {loading ? (
            <div className="p-4 text-center text-neutral-400 text-sm">Cargando...</div>
          ) : tariffs.length === 0 ? (
            <div className="p-4 text-center text-neutral-400 text-sm border border-neutral-200 rounded">
              Sin tarifas especiales configuradas
            </div>
          ) : (
            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Arreglo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Condición</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Precio</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Ruta</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                    <th className="px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {tariffs.map((t) => (
                    <tr key={t.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-3 py-2">
                        <div className="font-medium truncate max-w-[150px]">
                          {t.entity?.legal_name || `Cliente #${t.entity_id}`}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{t.name}</div>
                        {t.description && (
                          <div className="text-xs text-neutral-400 truncate max-w-[150px]">{t.description}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="default" className="text-xs">
                          {formatCondition(t)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono font-medium">
                        {formatPricing(t)}
                      </td>
                      <td className="px-3 py-2 text-neutral-500 text-xs">
                        {t.origin && t.destination ? (
                          `${t.origin} → ${t.destination}`
                        ) : t.origin ? (
                          `Desde ${t.origin}`
                        ) : t.destination ? (
                          `A ${t.destination}`
                        ) : (
                          <span className="text-neutral-300">Todas</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => toggleActive(t)}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                            t.is_active
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                          }`}
                        >
                          {t.is_active ? (
                            <>
                              <Check className="h-3 w-3" />
                              Activa
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3" />
                              Inactiva
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => deleteTariff(t.id)}
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


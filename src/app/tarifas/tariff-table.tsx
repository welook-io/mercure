"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface Tariff {
  id: number;
  origin: string;
  destination: string;
  tariff_type: string;
  weight_from_kg: number;
  weight_to_kg: number;
  price: number;
  price_per_kg: number | null;
  valid_from: string;
  valid_until: string | null;
}

interface EditingCell {
  id: number;
  field: 'price' | 'price_per_kg';
  value: string;
}

export function TariffTable({ initialTariffs }: { initialTariffs: Tariff[] }) {
  const [tariffs, setTariffs] = useState<Tariff[]>(initialTariffs);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (id: number, field: 'price' | 'price_per_kg', currentValue: number | null) => {
    setEditing({
      id,
      field,
      value: currentValue?.toString() || ''
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/tariffs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          field: editing.field,
          value: parseFloat(editing.value) || 0
        })
      });

      if (response.ok) {
        // Actualizar estado local
        setTariffs(prev => prev.map(t => 
          t.id === editing.id 
            ? { ...t, [editing.field]: parseFloat(editing.value) || 0 }
            : t
        ));
        setEditing(null);
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className="border border-neutral-200 rounded overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Origen</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destino</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Peso</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Precio</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">$/kg</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Vigencia</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {tariffs.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-neutral-400">Sin tarifas</td></tr>
            ) : (
              tariffs.map((t) => {
                const isActive = !t.valid_until || new Date(t.valid_until) >= new Date();
                const isEditingPrice = editing?.id === t.id && editing?.field === 'price';
                const isEditingPricePerKg = editing?.id === t.id && editing?.field === 'price_per_kg';
                
                return (
                  <tr key={t.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-3 py-2 font-medium">{t.origin}</td>
                    <td className="px-3 py-2">{t.destination}</td>
                    <td className="px-3 py-2">
                      <Badge variant={t.tariff_type === 'express' ? 'warning' : 'default'}>
                        {t.tariff_type || 'std'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-neutral-600 text-xs whitespace-nowrap">
                      {t.weight_from_kg || '0'}-{t.weight_to_kg || '∞'}kg
                    </td>
                    
                    {/* Precio editable */}
                    <td className="px-3 py-2">
                      {isEditingPrice ? (
                        <div className="flex items-center gap-1">
                          <span className="text-neutral-400">$</span>
                          <input
                            type="number"
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onKeyDown={handleKeyDown}
                            className="w-20 h-6 px-1 text-sm border border-orange-300 rounded focus:outline-none focus:border-orange-500"
                            autoFocus
                            disabled={saving}
                          />
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="p-0.5 hover:bg-green-100 rounded text-green-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-0.5 hover:bg-red-100 rounded text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEdit(t.id, 'price', t.price)}
                          className="font-medium cursor-pointer hover:bg-orange-50 hover:text-orange-600 px-1 py-0.5 rounded -mx-1 transition-colors"
                          title="Click para editar"
                        >
                          ${Number(t.price).toLocaleString('es-AR')}
                        </span>
                      )}
                    </td>
                    
                    {/* Precio por kg editable */}
                    <td className="px-3 py-2">
                      {isEditingPricePerKg ? (
                        <div className="flex items-center gap-1">
                          <span className="text-neutral-400">$</span>
                          <input
                            type="number"
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            onKeyDown={handleKeyDown}
                            className="w-16 h-6 px-1 text-sm border border-orange-300 rounded focus:outline-none focus:border-orange-500"
                            autoFocus
                            disabled={saving}
                          />
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="p-0.5 hover:bg-green-100 rounded text-green-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-0.5 hover:bg-red-100 rounded text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEdit(t.id, 'price_per_kg', t.price_per_kg)}
                          className="text-neutral-600 cursor-pointer hover:bg-orange-50 hover:text-orange-600 px-1 py-0.5 rounded -mx-1 transition-colors"
                          title="Click para editar"
                        >
                          {t.price_per_kg ? `$${t.price_per_kg}` : '-'}
                        </span>
                      )}
                    </td>
                    
                    <td className="px-3 py-2 text-neutral-400 text-xs whitespace-nowrap">
                      {new Date(t.valid_from).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={isActive ? 'success' : 'error'}>{isActive ? 'Vigente' : 'Vencida'}</Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



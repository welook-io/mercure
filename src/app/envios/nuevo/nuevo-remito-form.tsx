"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Save, Plus, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
  payment_terms: string | null;
}

const ORIGENES = [
  'LANUS',
  'JUJUY',
  'SALTA',
  'TUCUMAN',
];

const DESTINOS = [
  'JUJUY',
  'SALTA',
  'TUCUMAN',
  'LANUS',
  'BUENOS AIRES',
];

export function NuevoRemitoForm({ entities }: { entities: Entity[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [keepAdding, setKeepAdding] = useState(true);

  const [formData, setFormData] = useState({
    delivery_note_number: '',
    sender_id: '',
    recipient_id: '',
    origin: 'LANUS',
    destination: 'JUJUY',
    weight_kg: '',
    volume_m3: '',
    package_quantity: '1',
    declared_value: '',
    freight_cost: '',
    insurance_cost: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.delivery_note_number) {
        throw new Error('Nº de remito es requerido');
      }
      if (!formData.sender_id) {
        throw new Error('Remitente es requerido');
      }

      const { error: insertError } = await supabase
        .from('mercure_shipments')
        .insert({
          delivery_note_number: formData.delivery_note_number,
          sender_id: parseInt(formData.sender_id),
          recipient_id: formData.recipient_id ? parseInt(formData.recipient_id) : null,
          origin: formData.origin,
          destination: formData.destination,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
          volume_m3: formData.volume_m3 ? parseFloat(formData.volume_m3) : null,
          package_quantity: formData.package_quantity ? parseInt(formData.package_quantity) : 1,
          declared_value: formData.declared_value ? parseFloat(formData.declared_value) : null,
          freight_cost: formData.freight_cost ? parseFloat(formData.freight_cost) : null,
          insurance_cost: formData.insurance_cost ? parseFloat(formData.insurance_cost) : null,
          notes: formData.notes || null,
          status: 'rendida', // Para que aparezca en cuenta corriente
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      const senderName = entities.find(e => e.id === parseInt(formData.sender_id))?.legal_name;
      setSuccess(`Remito ${formData.delivery_note_number} guardado para ${senderName}`);

      if (keepAdding) {
        // Limpiar solo algunos campos
        setFormData(prev => ({
          ...prev,
          delivery_note_number: '',
          recipient_id: '',
          weight_kg: '',
          volume_m3: '',
          package_quantity: '1',
          declared_value: '',
          freight_cost: '',
          insurance_cost: '',
          notes: '',
        }));
      } else {
        router.push('/cuentas-corrientes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Calcular totales mientras escribe
  const flete = parseFloat(formData.freight_cost) || 0;
  const seguro = parseFloat(formData.insurance_cost) || 0;
  const subtotal = flete + seguro;
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Datos básicos */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Nº Remito *
          </label>
          <input
            type="text"
            name="delivery_note_number"
            value={formData.delivery_note_number}
            onChange={handleChange}
            placeholder="0001-00000123"
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0 font-mono"
          />
        </div>

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
            {ORIGENES.map(o => (
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
            {DESTINOS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Remitente y Destinatario */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Remitente (Cliente) *
          </label>
          <select
            name="sender_id"
            value={formData.sender_id}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          >
            <option value="">Seleccionar...</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>
                {e.legal_name} {e.payment_terms === 'cuenta_corriente' ? '(CC)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Destinatario
          </label>
          <select
            name="recipient_id"
            value={formData.recipient_id}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          >
            <option value="">Seleccionar...</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>{e.legal_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Datos del bulto */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Bultos
          </label>
          <input
            type="number"
            name="package_quantity"
            value={formData.package_quantity}
            onChange={handleChange}
            min="1"
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Peso (kg)
          </label>
          <input
            type="number"
            name="weight_kg"
            value={formData.weight_kg}
            onChange={handleChange}
            step="0.01"
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
            step="0.01"
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Valor Declarado
          </label>
          <input
            type="number"
            name="declared_value"
            value={formData.declared_value}
            onChange={handleChange}
            step="0.01"
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>
      </div>

      {/* Costos */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Flete $
          </label>
          <input
            type="number"
            name="freight_cost"
            value={formData.freight_cost}
            onChange={handleChange}
            step="0.01"
            placeholder="0.00"
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Seguro $
          </label>
          <input
            type="number"
            name="insurance_cost"
            value={formData.insurance_cost}
            onChange={handleChange}
            step="0.01"
            placeholder="0.00"
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>
      </div>

      {/* Resumen de costos */}
      {(flete > 0 || seguro > 0) && (
        <div className="bg-neutral-50 rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">Flete:</span>
              <span className="ml-2 font-medium">${flete.toLocaleString('es-AR')}</span>
            </div>
            <div>
              <span className="text-neutral-500">Seguro:</span>
              <span className="ml-2 font-medium">${seguro.toLocaleString('es-AR')}</span>
            </div>
            <div>
              <span className="text-neutral-500">IVA 21%:</span>
              <span className="ml-2 font-medium">${iva.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-neutral-500">Total:</span>
              <span className="ml-2 font-bold text-orange-600">${total.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notas */}
      <div>
        <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
          Notas
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          placeholder="Observaciones opcionales"
          className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0 resize-none"
        />
      </div>

      {/* Opción de seguir agregando */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="keepAdding"
          checked={keepAdding}
          onChange={(e) => setKeepAdding(e.target.checked)}
          className="rounded border-neutral-300"
        />
        <label htmlFor="keepAdding" className="text-sm text-neutral-600">
          Seguir agregando remitos después de guardar
        </label>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4 border-t border-neutral-200">
        <Link
          href="/cuentas-corrientes"
          className="flex-1 h-10 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium rounded flex items-center justify-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Ir a Cuentas Corrientes
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-300 text-white font-medium rounded flex items-center justify-center gap-2 text-sm"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Guardar Remito
            </>
          )}
        </button>
      </div>
    </form>
  );
}


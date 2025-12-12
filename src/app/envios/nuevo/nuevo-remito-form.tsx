"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, ArrowLeft, CheckCircle2, Calculator } from "lucide-react";
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

// Formatear número como moneda argentina
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Parsear string con formato de moneda a número
function parseCurrency(value: string): string {
  // Remover todo excepto números, comas y puntos
  const cleaned = value.replace(/[^\d,.-]/g, '');
  // Convertir formato argentino (1.234,56) a número
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? '' : num.toString();
}

// Input de moneda con formato
function CurrencyInput({ 
  name, 
  value, 
  onChange, 
  placeholder = '0,00',
  label,
  prefix = '$'
}: { 
  name: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  label: string;
  prefix?: string;
}) {
  const numValue = parseFloat(value) || 0;
  const displayValue = value ? formatCurrency(numValue) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseCurrency(e.target.value);
    onChange({ ...e, target: { ...e.target, name, value: rawValue } });
  };

  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
          {prefix}
        </span>
        <input
          type="text"
          name={name}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full h-10 pl-7 pr-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0 text-right font-mono"
        />
      </div>
    </div>
  );
}

export function NuevoRemitoForm({ entities }: { entities: Entity[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [keepAdding, setKeepAdding] = useState(true);
  const [pricingInfo, setPricingInfo] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    delivery_note_number: '',
    sender_name: '', // Campo abierto para remitente
    recipient_id: '', // Cliente (destinatario)
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
    setPricingInfo(null);
  };

  // Calcular flete y seguro automáticamente
  const handleCalculate = async () => {
    setCalculating(true);
    setError(null);
    setPricingInfo(null);

    try {
      if (!formData.recipient_id) {
        throw new Error('Seleccione el cliente (destinatario) primero');
      }

      const client = entities.find(e => e.id === parseInt(formData.recipient_id));
      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      const response = await fetch('/api/detect-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientCuit: client.tax_id,
          recipientName: client.legal_name,
          destination: formData.destination,
          packageQuantity: parseInt(formData.package_quantity) || 1,
          weightKg: parseFloat(formData.weight_kg) || 0,
          volumeM3: parseFloat(formData.volume_m3) || 0,
          declaredValue: parseFloat(formData.declared_value) || 0,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al calcular');
      }

      // Extraer los valores del breakdown
      const breakdown = result.pricing?.breakdown || {};
      const flete = breakdown.flete || breakdown.freight || result.pricing?.price || 0;
      const seguro = breakdown.seguro || breakdown.insurance || 0;

      setFormData(prev => ({
        ...prev,
        freight_cost: flete.toFixed(2),
        insurance_cost: seguro.toFixed(2),
      }));

      setPricingInfo(`${result.pathName} - ${result.tag?.label || 'Calculado'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular');
    } finally {
      setCalculating(false);
    }
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
      if (!formData.recipient_id) {
        throw new Error('Cliente (destinatario) es requerido');
      }

      // El cliente es el destinatario (recipient_id), que es quien paga
      // Usamos sender_id también como el cliente para la cuenta corriente
      const clientId = parseInt(formData.recipient_id);

      const { error: insertError } = await supabase
        .from('mercure_shipments')
        .insert({
          delivery_note_number: formData.delivery_note_number,
          sender_id: clientId, // El cliente va en sender_id para CC
          recipient_id: clientId,
          sender_name: formData.sender_name || null, // Nombre libre del remitente
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

      const clientName = entities.find(e => e.id === clientId)?.legal_name;
      setSuccess(`Remito ${formData.delivery_note_number} guardado para ${clientName}`);

      if (keepAdding) {
        // Limpiar solo algunos campos, mantener cliente
        setFormData(prev => ({
          ...prev,
          delivery_note_number: '',
          sender_name: '',
          weight_kg: '',
          volume_m3: '',
          package_quantity: '1',
          declared_value: '',
          freight_cost: '',
          insurance_cost: '',
          notes: '',
        }));
        setPricingInfo(null);
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

      {/* Cliente y Remitente */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Cliente (Destinatario) *
          </label>
          <select
            name="recipient_id"
            value={formData.recipient_id}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          >
            <option value="">Seleccionar cliente...</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>
                {e.legal_name} {e.payment_terms === 'cuenta_corriente' ? '(CC)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-400 mt-1">El cliente es quien paga el flete</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Remitente (origen de la carga)
          </label>
          <input
            type="text"
            name="sender_name"
            value={formData.sender_name}
            onChange={handleChange}
            placeholder="Nombre del remitente"
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
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

        <CurrencyInput
          name="declared_value"
          value={formData.declared_value}
          onChange={handleChange}
          label="Valor Declarado"
        />
      </div>

      {/* Costos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-neutral-500 uppercase">
            Costos
          </label>
          <button
            type="button"
            onClick={handleCalculate}
            disabled={calculating || !formData.recipient_id}
            className="h-8 px-3 text-sm bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white rounded flex items-center gap-2"
          >
            {calculating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                Calcular Automático
              </>
            )}
          </button>
        </div>

        {pricingInfo && (
          <div className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded">
            ✓ {pricingInfo}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput
            name="freight_cost"
            value={formData.freight_cost}
            onChange={handleChange}
            label="Flete"
          />
          <CurrencyInput
            name="insurance_cost"
            value={formData.insurance_cost}
            onChange={handleChange}
            label="Seguro"
          />
        </div>
      </div>

      {/* Resumen de costos */}
      {(flete > 0 || seguro > 0) && (
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-neutral-400 text-xs uppercase mb-1">Flete</div>
              <div className="font-mono font-medium">$ {formatCurrency(flete)}</div>
            </div>
            <div className="text-center">
              <div className="text-neutral-400 text-xs uppercase mb-1">Seguro</div>
              <div className="font-mono font-medium">$ {formatCurrency(seguro)}</div>
            </div>
            <div className="text-center">
              <div className="text-neutral-400 text-xs uppercase mb-1">IVA 21%</div>
              <div className="font-mono font-medium">$ {formatCurrency(iva)}</div>
            </div>
            <div className="text-center bg-orange-50 rounded py-1 -my-1">
              <div className="text-orange-600 text-xs uppercase mb-1 font-medium">Total</div>
              <div className="font-mono font-bold text-orange-600">$ {formatCurrency(total)}</div>
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


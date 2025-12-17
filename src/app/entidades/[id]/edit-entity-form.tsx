"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEntity, upsertCommercialTerms, deleteCommercialTerms } from "./actions";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
  entity_type: string | null;
  payment_terms: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

interface CommercialTerms {
  id: number;
  tariff_modifier: number;
  insurance_rate: number;
  credit_days: number;
}

const ENTITY_TYPES = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'transportista', label: 'Transportista' },
  { value: 'otro', label: 'Otro' },
];

const PAYMENT_TERMS = [
  { value: 'contado', label: 'Contado' },
  { value: 'cuenta_corriente', label: 'Cuenta Corriente' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'transferencia', label: 'Transferencia' },
];

export function EditEntityForm({ entity, commercialTerms }: { entity: Entity; commercialTerms: CommercialTerms | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    legal_name: entity.legal_name || '',
    tax_id: entity.tax_id || '',
    entity_type: entity.entity_type || '',
    payment_terms: entity.payment_terms || '',
    email: entity.email || '',
    phone: entity.phone || '',
    address: entity.address || '',
    notes: entity.notes || '',
    // Acuerdo comercial
    tariff_modifier: commercialTerms?.tariff_modifier?.toString() || '0',
    insurance_rate: commercialTerms?.insurance_rate ? (Number(commercialTerms.insurance_rate) * 100).toString() : '0.8',
    credit_days: commercialTerms?.credit_days?.toString() || '0',
  });
  
  const [hasCommercialTerms, setHasCommercialTerms] = useState(!!commercialTerms);

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
      // Actualizar entidad solo con campos que existen
      const { error: updateError } = await supabase
        .schema('mercure').from('entities')
        .update({
          legal_name: formData.legal_name,
          tax_id: formData.tax_id || null,
          entity_type: formData.entity_type || null,
          payment_terms: formData.payment_terms || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          notes: formData.notes || null,
        })
        .eq('id', entity.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Guardar o actualizar términos comerciales si están habilitados
      if (hasCommercialTerms) {
        const termsData = {
          entity_id: entity.id,
          tariff_modifier: parseFloat(formData.tariff_modifier) || 0,
          insurance_rate: (parseFloat(formData.insurance_rate) || 0.8) / 100, // Convertir de % a decimal
          credit_days: parseInt(formData.credit_days) || 0,
        };

        if (commercialTerms) {
          // Actualizar existente
          const { error: termsError } = await supabase
            .schema('mercure').from('client_commercial_terms')
            .update(termsData)
            .eq('id', commercialTerms.id);
          
          if (termsError) throw new Error(termsError.message);
        } else {
          // Crear nuevo
          const { error: termsError } = await supabase
            .schema('mercure').from('client_commercial_terms')
            .insert(termsData);
          
          if (termsError) throw new Error(termsError.message);
        }
      } else if (commercialTerms) {
        // Si se deshabilitó, eliminar los términos
        const { error: deleteError } = await supabase
          .schema('mercure').from('client_commercial_terms')
          .delete()
          .eq('id', commercialTerms.id);
        
        if (deleteError) throw new Error(deleteError.message);
      }

      router.push('/entidades');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Razón Social *
          </label>
          <input
            type="text"
            name="legal_name"
            value={formData.legal_name}
            onChange={handleChange}
            required
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            CUIT
          </label>
          <input
            type="text"
            name="tax_id"
            value={formData.tax_id}
            onChange={handleChange}
            placeholder="30-12345678-9"
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Tipo
          </label>
          <select
            name="entity_type"
            value={formData.entity_type}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          >
            <option value="">Seleccionar...</option>
            {ENTITY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Condición de Pago
          </label>
          <select
            name="payment_terms"
            value={formData.payment_terms}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          >
            <option value="">Seleccionar...</option>
            {PAYMENT_TERMS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Teléfono
          </label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Dirección
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Notas
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0 resize-none"
          />
        </div>
      </div>

      {/* Acuerdo Comercial */}
      <div className="border border-neutral-200 rounded overflow-hidden mt-6">
        <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Acuerdo Comercial
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasCommercialTerms}
              onChange={(e) => setHasCommercialTerms(e.target.checked)}
              className="w-4 h-4 text-orange-500 border-neutral-300 rounded focus:ring-orange-500"
            />
            <span className="text-xs text-neutral-600">Habilitar</span>
          </label>
        </div>
        
        {hasCommercialTerms && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Modificador Tarifa (%)
              </label>
              <input
                type="number"
                name="tariff_modifier"
                value={formData.tariff_modifier}
                onChange={handleChange}
                step="1"
                className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                placeholder="-15"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Negativo = descuento, Positivo = recargo
              </p>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Tasa Seguro (%)
              </label>
              <input
                type="number"
                name="insurance_rate"
                value={formData.insurance_rate}
                onChange={handleChange}
                step="0.1"
                min="0"
                className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                placeholder="0.8"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Ej: 0.8 = 0.8% del valor declarado
              </p>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Días de Crédito
              </label>
              <input
                type="number"
                name="credit_days"
                value={formData.credit_days}
                onChange={handleChange}
                step="1"
                min="0"
                className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                placeholder="15"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                0 = contado
              </p>
            </div>
          </div>
        )}
        
        {!hasCommercialTerms && (
          <div className="p-4 text-sm text-neutral-400 text-center">
            Sin acuerdo comercial - Se aplicará tarifa general
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Link
          href="/entidades"
          className="flex-1 h-10 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium rounded flex items-center justify-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
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
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </form>
  );
}

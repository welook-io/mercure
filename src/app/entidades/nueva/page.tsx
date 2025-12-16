"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { Loader2, Save, ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

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

const IVA_CONDITIONS = [
  { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
  { value: 'monotributista', label: 'Monotributista' },
  { value: 'exento', label: 'Exento' },
  { value: 'consumidor_final', label: 'Consumidor Final' },
];

export default function NuevaEntidadPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    legal_name: '',
    tax_id: '',
    entity_type: 'cliente',
    iva_condition: 'responsable_inscripto',
    payment_terms: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    contact_name: '',
    notes: '',
    // Acuerdo comercial
    tariff_modifier: '0',
    insurance_rate: '0.8',
    credit_days: '0',
  });
  
  const [hasCommercialTerms, setHasCommercialTerms] = useState(false);

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
      // Crear entidad
      const { data: newEntity, error: insertError } = await supabase
        .from('mercure_entities')
        .insert({
          legal_name: formData.legal_name,
          tax_id: formData.tax_id || null,
          entity_type: formData.entity_type || null,
          iva_condition: formData.iva_condition || null,
          payment_terms: formData.payment_terms || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          province: formData.province || null,
          postal_code: formData.postal_code || null,
          contact_name: formData.contact_name || null,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Guardar términos comerciales si están habilitados
      if (hasCommercialTerms && newEntity) {
        const termsData = {
          entity_id: newEntity.id,
          tariff_modifier: parseFloat(formData.tariff_modifier) || 0,
          insurance_rate: (parseFloat(formData.insurance_rate) || 0.8) / 100,
          credit_days: parseInt(formData.credit_days) || 0,
        };

        const { error: termsError } = await supabase
          .from('mercure_client_commercial_terms')
          .insert(termsData);
        
        if (termsError) throw new Error(termsError.message);
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
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-3 mb-4">
            <Link href="/entidades">
              <button className="h-8 w-8 flex items-center justify-center hover:bg-neutral-100 rounded">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <Building2 className="w-5 h-5 text-neutral-400" />
            <h1 className="text-lg font-medium text-neutral-900">Nueva Entidad</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                {error}
              </div>
            )}

            {/* Datos principales */}
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Datos de la Entidad
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="Nombre o Razón Social"
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
                    Tipo de Entidad
                  </label>
                  <select
                    name="entity_type"
                    value={formData.entity_type}
                    onChange={handleChange}
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  >
                    {ENTITY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Condición IVA
                  </label>
                  <select
                    name="iva_condition"
                    value={formData.iva_condition}
                    onChange={handleChange}
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  >
                    {IVA_CONDITIONS.map(t => (
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
              </div>
            </div>

            {/* Contacto */}
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Datos de Contacto
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@ejemplo.com"
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
                    placeholder="388-1234567"
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleChange}
                    placeholder="Nombre del contacto"
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Dirección
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Calle y número"
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="San Salvador de Jujuy"
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    placeholder="Jujuy"
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    placeholder="4600"
                    className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Notas
                </span>
              </div>
              <div className="p-4">
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Observaciones adicionales..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0 resize-none"
                />
              </div>
            </div>

            {/* Acuerdo Comercial */}
            <div className="border border-neutral-200 rounded overflow-hidden">
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

            {/* Botones */}
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
                    Crear Entidad
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


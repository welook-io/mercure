"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Calculator, Trash2, Upload, Image as ImageIcon, X, ChevronDown, ChevronUp, Info } from "lucide-react";

interface Entity {
  id: number;
  legal_name: string;
  tax_id: string | null;
}

interface ShipmentData {
  id: number;
  delivery_note_number: string | null;
  sender_id: number | null;
  recipient_id: number | null;
  recipient_address: string | null;
  package_quantity: number;
  weight_kg: number;
  volume_m3: number | null;
  declared_value: number;
  pickup_fee: number | null; // Costo de retiro
  load_description: string | null;
  paid_by: string | null;
  payment_terms: string | null;
  notes: string | null;
  quotation_id: string | null;
  remito_image_url: string | null;
  cargo_image_url: string | null;
  sender?: Entity | null;
  recipient?: Entity | null;
}

interface QuotationData {
  total_price: number;
  base_price: number;
  insurance_cost: number;
  pickup_fee: number;
}

interface EditShipmentFormProps {
  shipment: ShipmentData;
  entities: Entity[];
}

// Tipos para debug de pricing
interface DebugInfo {
  input: {
    weightKg: number;
    volumeM3: number;
    declaredValue: number;
    origin: string;
    destination: string;
  };
  decision: {
    pesoReal: number;
    pesoVolumetrico: number;
    factorConversion: number;
    pesoACobrar: number;
    criterioUsado: 'PESO_REAL' | 'PESO_VOLUMETRICO' | 'VOLUMEN_DIRECTO';
    explicacion: string;
  };
  tarifa: {
    encontrada: boolean;
    id?: number;
    origen?: string;
    destino?: string;
    rangoKg?: string;
    precioLista?: number;
    queryUsada?: string;
  };
  calculo: {
    fleteLista: number;
    modificador?: number;
    fleteConModificador: number;
    valorDeclarado: number;
    tasaSeguro: number;
    seguro: number;
    total: number;
    formula: string;
  };
}

interface SpecialTariff {
  id: number;
  name: string;
  description: string | null;
  matches: boolean;
  matchReason?: string;
}

interface PricingResult {
  path: 'A' | 'B' | 'C';
  pathName: string;
  tag: {
    color: 'green' | 'yellow' | 'red';
    label: string;
    description: string;
  };
  pricing: {
    source: string;
    price: number | null;
    breakdown?: Record<string, number>;
  };
  commercialTerms?: {
    tariffType: string;
    tariffModifier: number;
    insuranceRate: number;
  };
  specialTariffs?: SpecialTariff[];
  appliedSpecialTariff?: SpecialTariff;
  debug?: DebugInfo;
}

export function EditShipmentForm({ shipment, entities }: EditShipmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [newQuotation, setNewQuotation] = useState<{ price: number; breakdown: Record<string, number> } | null>(null);
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [manualFlete, setManualFlete] = useState<string>('');
  const [manualSeguro, setManualSeguro] = useState<string>('');
  const [useManualPrice, setUseManualPrice] = useState(false);
  
  // Estados para imágenes
  const [remitoImageUrl, setRemitoImageUrl] = useState<string | null>(shipment.remito_image_url);
  const [cargoImageUrl, setCargoImageUrl] = useState<string | null>(shipment.cargo_image_url);
  const [imageModal, setImageModal] = useState<{ url: string; title: string } | null>(null);
  const remitoInputRef = useRef<HTMLInputElement>(null);
  const cargoInputRef = useRef<HTMLInputElement>(null);
  
  // Cargar cotización existente
  useEffect(() => {
    async function loadQuotation() {
      if (shipment.quotation_id) {
        try {
          const response = await fetch(`/api/shipments?quotationId=${shipment.quotation_id}`);
          const result = await response.json();
          if (result.quotation) {
            setQuotation({
              total_price: Number(result.quotation.total_price),
              base_price: Number(result.quotation.base_price),
              insurance_cost: Number(result.quotation.insurance_cost),
              pickup_fee: Number(result.quotation.pickup_fee) || 0,
            });
          }
        } catch (error) {
          console.error('Error loading quotation:', error);
        }
      }
    }
    loadQuotation();
  }, [shipment.quotation_id]);
  
  const [formData, setFormData] = useState({
    delivery_note_number: shipment.delivery_note_number || '',
    sender_id: shipment.sender_id?.toString() || '',
    recipient_id: shipment.recipient_id?.toString() || '',
    recipient_address: shipment.recipient_address || '',
    package_quantity: shipment.package_quantity?.toString() || '',
    weight_kg: shipment.weight_kg?.toString() || '',
    volume_m3: shipment.volume_m3?.toString() || '',
    declared_value: shipment.declared_value?.toString() || '',
    pickup_fee: shipment.pickup_fee?.toString() || '',
    load_description: shipment.load_description || '',
    paid_by: shipment.paid_by || 'destino',
    payment_terms: shipment.payment_terms || 'contado',
    notes: shipment.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar cotización nueva si cambian datos relevantes
    if (['weight_kg', 'volume_m3', 'declared_value', 'recipient_id'].includes(name)) {
      setNewQuotation(null);
    }
  };

  const handleRecotizar = async () => {
    setIsQuoting(true);
    setMessage(null);
    setNewQuotation(null);
    setPricingResult(null);

    try {
      const response = await fetch('/api/detect-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formData.recipient_id ? parseInt(formData.recipient_id) : null,
          cargo: {
            weightKg: formData.weight_kg ? parseFloat(formData.weight_kg) : 0,
            volumeM3: formData.volume_m3 ? parseFloat(formData.volume_m3) : null,
            declaredValue: formData.declared_value ? parseFloat(formData.declared_value) : null,
          },
          origin: 'Buenos Aires',
          destination: 'Jujuy',
        }),
      });

      if (!response.ok) throw new Error('Error en cotizador');

      const result = await response.json();
      
      // Guardar resultado completo para mostrar debug
      setPricingResult(result);
      
      if (result.pricing?.price > 0) {
        setNewQuotation({
          price: result.pricing.price,
          breakdown: result.pricing.breakdown || {},
        });
        setMessage({ type: 'success', text: `Nuevo precio: $${result.pricing.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` });
        // Mostrar panel de debug automáticamente
        setShowDebugPanel(true);
      } else {
        setMessage({ type: 'error', text: 'No se pudo calcular el precio. Verificá peso/volumen.' });
      }
    } catch (error) {
      console.error('Error recotizando:', error);
      setMessage({ type: 'error', text: 'Error al recotizar' });
    } finally {
      setIsQuoting(false);
    }
  };

  // Subir imagen
  const handleImageUpload = async (file: File, type: 'remito' | 'cargo') => {
    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('shipmentId', shipment.id.toString());
      formData.append('type', type);

      const response = await fetch('/api/shipments', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir la imagen');
      }

      // Actualizar estado local
      if (type === 'remito') {
        setRemitoImageUrl(result.url);
      } else {
        setCargoImageUrl(result.url);
      }

      setMessage({ type: 'success', text: result.message });
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al subir la imagen' });
    } finally {
      setIsUploading(false);
    }
  };

  // Eliminar remito
  const handleDelete = async () => {
    setIsDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/shipments?id=${shipment.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar');
      }

      setMessage({ type: 'success', text: result.message });
      
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      console.error('Error eliminando:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al eliminar el remito' });
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // Si hay nueva cotización (automática o manual), prepararla
      const finalFlete = useManualPrice && manualFlete 
        ? parseFloat(manualFlete) 
        : (newQuotation?.breakdown?.flete_final || newQuotation?.breakdown?.flete_lista || 0);
      
      const finalSeguro = useManualPrice && manualSeguro 
        ? parseFloat(manualSeguro) 
        : (newQuotation?.breakdown?.seguro || 0);
      
      const finalPrice = useManualPrice 
        ? (parseFloat(manualFlete) || 0) + (parseFloat(manualSeguro) || 0)
        : newQuotation?.price;

      const newQuotationData = finalPrice && finalPrice > 0 ? {
        price: finalPrice,
        breakdown: useManualPrice 
          ? { 
              flete_lista: parseFloat(manualFlete) || 0,
              flete_final: parseFloat(manualFlete) || 0,
              seguro: parseFloat(manualSeguro) || 0,
            }
          : newQuotation?.breakdown || {},
        isManual: useManualPrice,
        flete: finalFlete,
        seguro: finalSeguro,
      } : null;

      const response = await fetch('/api/shipments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: shipment.id,
          updateData: formData,
          newQuotation: newQuotationData,
          entities: entities,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar');
      }

      setMessage({ type: 'success', text: result.message });
      
      // Redirigir después de 1 segundo
      setTimeout(() => {
        router.back();
      }, 1000);

    } catch (error) {
      console.error('Error updating shipment:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al actualizar el envío' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const remitoNumber = shipment.delivery_note_number || `#${shipment.id}`;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-neutral-100 rounded text-neutral-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-medium text-neutral-900">Editar Envío</h1>
            <p className="text-xs text-neutral-500">Remito {remitoNumber}</p>
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {message && (
        <div className={`mb-4 px-3 py-2 rounded text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Remitente y Destinatario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Remitente</label>
            <select
              name="sender_id"
              value={formData.sender_id}
              onChange={handleChange}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            >
              <option value="">Seleccionar...</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.legal_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Destinatario</label>
            <select
              name="recipient_id"
              value={formData.recipient_id}
              onChange={handleChange}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            >
              <option value="">Seleccionar...</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.legal_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dirección de entrega */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Dirección de Entrega</label>
          <input
            type="text"
            name="recipient_address"
            value={formData.recipient_address}
            onChange={handleChange}
            className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            placeholder="Dirección completa"
          />
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Bultos</label>
            <input
              type="number"
              name="package_quantity"
              value={formData.package_quantity}
              onChange={handleChange}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Peso (kg)</label>
            <input
              type="number"
              name="weight_kg"
              value={formData.weight_kg}
              onChange={handleChange}
              step="0.01"
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Volumen (m³)</label>
            <input
              type="number"
              name="volume_m3"
              value={formData.volume_m3}
              onChange={handleChange}
              step="0.001"
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Valor Declarado ($)</label>
            <input
              type="number"
              name="declared_value"
              value={formData.declared_value}
              onChange={handleChange}
              step="0.01"
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Retiro ($)</label>
            <input
              type="number"
              name="pickup_fee"
              value={formData.pickup_fee}
              onChange={handleChange}
              step="100"
              placeholder="0"
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
              min="0"
            />
            <span className="text-[10px] text-neutral-400">Costo de recolección en origen</span>
          </div>
        </div>

        {/* Cotización */}
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-neutral-500 uppercase">Cotización</label>
            <div className="flex items-center gap-2">
              {/* Toggle Manual/Automático */}
              <div className="flex items-center gap-1 text-xs text-neutral-500">
                <button
                  type="button"
                  onClick={() => {
                    setUseManualPrice(false);
                    setManualFlete('');
                    setManualSeguro('');
                  }}
                  className={`px-2 py-1 rounded ${!useManualPrice ? 'bg-neutral-200 text-neutral-700 font-medium' : 'hover:bg-neutral-100'}`}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseManualPrice(true);
                    setNewQuotation(null);
                  }}
                  className={`px-2 py-1 rounded ${useManualPrice ? 'bg-orange-100 text-orange-700 font-medium' : 'hover:bg-neutral-100'}`}
                >
                  Manual
                </button>
              </div>
              {!useManualPrice && (
                <button
                  type="button"
                  onClick={handleRecotizar}
                  disabled={isQuoting}
                  className="h-7 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isQuoting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Calculator className="w-3 h-3" />
                  )}
                  {isQuoting ? 'Calculando...' : 'Recotizar'}
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">Precio actual:</span>
              <p className={`font-medium ${quotation ? 'text-neutral-900' : 'text-amber-600'}`}>
                {quotation ? `$${quotation.total_price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : 'Sin cotizar'}
              </p>
              {quotation && (
                <p className="text-xs text-neutral-400">
                  Flete: ${quotation.base_price.toLocaleString('es-AR')} + Seguro: ${quotation.insurance_cost.toLocaleString('es-AR')}{quotation.pickup_fee > 0 && ` + Retiro: $${quotation.pickup_fee.toLocaleString('es-AR')}`}
                </p>
              )}
            </div>
            
            {/* Precio manual - Flete y Seguro separados */}
            {useManualPrice ? (
              <div className="bg-orange-50 border border-orange-200 rounded p-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-orange-700 text-xs block mb-1">Flete:</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-400 text-sm">$</span>
                      <input
                        type="number"
                        value={manualFlete}
                        onChange={(e) => setManualFlete(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-8 pl-6 pr-2 text-sm font-bold text-orange-800 border border-orange-300 rounded focus:border-orange-500 focus:ring-0 bg-white"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-orange-700 text-xs block mb-1">Seguro:</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-400 text-sm">$</span>
                      <input
                        type="number"
                        value={manualSeguro}
                        onChange={(e) => setManualSeguro(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-8 pl-6 pr-2 text-sm font-bold text-orange-800 border border-orange-300 rounded focus:border-orange-500 focus:ring-0 bg-white"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
                {/* Calcular seguro automáticamente */}
                {formData.declared_value && parseFloat(formData.declared_value) > 0 && !manualSeguro && (
                  <button
                    type="button"
                    onClick={() => {
                      const seguro = parseFloat(formData.declared_value) * 0.008;
                      setManualSeguro(seguro.toFixed(2));
                    }}
                    className="text-xs text-orange-600 hover:text-orange-800 underline"
                  >
                    Calcular seguro (8‰ = ${(parseFloat(formData.declared_value) * 0.008).toLocaleString('es-AR', { minimumFractionDigits: 2 })})
                  </button>
                )}
                {(manualFlete || manualSeguro) && (
                  <div className="mt-2 pt-2 border-t border-orange-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-600">Total:</span>
                      <span className="font-bold text-orange-800">
                        ${((parseFloat(manualFlete) || 0) + (parseFloat(manualSeguro) || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-orange-600 mt-1">Se guardará al confirmar</p>
                  </div>
                )}
              </div>
            ) : newQuotation ? (
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <span className="text-green-700 text-xs">Nuevo precio:</span>
                <p className="font-bold text-green-800">
                  ${newQuotation.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                {/* Mostrar breakdown de flete y seguro */}
                {(newQuotation.breakdown?.flete_final || newQuotation.breakdown?.flete_lista || newQuotation.breakdown?.seguro) && (
                  <p className="text-xs text-green-600 mt-1">
                    Flete: ${(newQuotation.breakdown.flete_final || newQuotation.breakdown.flete_lista || 0).toLocaleString('es-AR')}
                    {newQuotation.breakdown.seguro > 0 && ` + Seguro: $${newQuotation.breakdown.seguro.toLocaleString('es-AR')}`}
                  </p>
                )}
                <p className="text-xs text-green-600 mt-1">Se guardará al confirmar</p>
              </div>
            ) : null}
          </div>
          
          {/* Panel de Debug - Regla y Fórmula utilizada */}
          {pricingResult && (
            <div className="mt-3 pt-3 border-t border-neutral-200">
              {/* Header con tag y toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    pricingResult.tag.color === 'green' 
                      ? 'bg-green-100 text-green-800' 
                      : pricingResult.tag.color === 'yellow'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {pricingResult.tag.label}
                  </span>
                  <span className="text-xs text-neutral-600">
                    {pricingResult.pathName}
                  </span>
                  {pricingResult.appliedSpecialTariff && (
                    <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                      ⭐ {pricingResult.appliedSpecialTariff.name}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                >
                  <Info className="w-3 h-3" />
                  {showDebugPanel ? 'Ocultar' : 'Ver'} fórmula
                  {showDebugPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
              
              {/* Descripción del tag */}
              <p className="text-xs text-neutral-500 mt-1">
                {pricingResult.tag.description}
              </p>
              
              {/* Panel de debug expandido */}
              {showDebugPanel && pricingResult.debug && (
                <div className="mt-3 space-y-3 text-xs">
                  {/* Decisión de peso */}
                  <div className="bg-white p-2 rounded border border-neutral-200">
                    <div className="font-medium text-neutral-700 mb-1">📐 Decisión de peso:</div>
                    <div className="text-neutral-600 mb-2">{pricingResult.debug.decision.explicacion}</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className={`p-1 rounded ${pricingResult.debug.decision.criterioUsado === 'PESO_REAL' ? 'bg-green-100 text-green-800 font-medium' : 'bg-neutral-100'}`}>
                        <div className="text-[10px] uppercase">Peso Real</div>
                        <div className="font-mono">{pricingResult.debug.decision.pesoReal} kg</div>
                      </div>
                      <div className={`p-1 rounded ${pricingResult.debug.decision.criterioUsado === 'PESO_VOLUMETRICO' ? 'bg-green-100 text-green-800 font-medium' : 'bg-neutral-100'}`}>
                        <div className="text-[10px] uppercase">Peso Volum.</div>
                        <div className="font-mono">{pricingResult.debug.decision.pesoVolumetrico.toFixed(1)} kg</div>
                      </div>
                      <div className="p-1 rounded bg-blue-100 text-blue-800 font-medium">
                        <div className="text-[10px] uppercase">→ A Cobrar</div>
                        <div className="font-mono">{pricingResult.debug.decision.pesoACobrar} kg</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tarifa encontrada */}
                  <div className="bg-white p-2 rounded border border-neutral-200">
                    <div className="font-medium text-neutral-700 mb-1">📋 Tarifa:</div>
                    {pricingResult.debug.tarifa.encontrada ? (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Ruta:</span>
                          <span className="font-medium">{pricingResult.debug.tarifa.origen} → {pricingResult.debug.tarifa.destino}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rango:</span>
                          <span className="font-mono">{pricingResult.debug.tarifa.rangoKg} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Precio lista:</span>
                          <span className="font-mono font-medium">${pricingResult.debug.tarifa.precioLista?.toLocaleString('es-AR')}</span>
                        </div>
                        {pricingResult.debug.tarifa.queryUsada && (
                          <div className="text-[10px] text-neutral-400 mt-1 p-1 bg-neutral-50 rounded font-mono">
                            {pricingResult.debug.tarifa.queryUsada}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-red-600">
                        ⚠️ No se encontró tarifa específica
                        {pricingResult.debug.tarifa.queryUsada && (
                          <div className="text-[10px] text-neutral-400 mt-1 p-1 bg-neutral-50 rounded font-mono">
                            {pricingResult.debug.tarifa.queryUsada}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Fórmula y cálculo */}
                  <div className="bg-white p-2 rounded border border-neutral-200">
                    <div className="font-medium text-neutral-700 mb-1">🧮 Fórmula aplicada:</div>
                    <div className="p-2 bg-blue-50 text-blue-800 rounded font-mono text-[11px] break-words">
                      {pricingResult.debug.calculo.formula}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex justify-between">
                        <span>Flete lista:</span>
                        <span className="font-mono">${pricingResult.debug.calculo.fleteLista.toLocaleString('es-AR')}</span>
                      </div>
                      {pricingResult.debug.calculo.modificador !== undefined && (
                        <div className="flex justify-between">
                          <span>Modificador:</span>
                          <span className={`font-mono ${pricingResult.debug.calculo.modificador < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pricingResult.debug.calculo.modificador}%
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Seguro ({(pricingResult.debug.calculo.tasaSeguro * 1000).toFixed(0)}‰):</span>
                        <span className="font-mono">${pricingResult.debug.calculo.seguro.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>TOTAL:</span>
                        <span className="font-mono">${pricingResult.debug.calculo.total.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Términos comerciales si existen */}
                  {pricingResult.commercialTerms && (
                    <div className="bg-white p-2 rounded border border-neutral-200">
                      <div className="font-medium text-neutral-700 mb-1">📄 Condiciones comerciales:</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex justify-between">
                          <span>Tipo tarifa:</span>
                          <span className="font-medium">{pricingResult.commercialTerms.tariffType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Modificador:</span>
                          <span className={`font-mono ${pricingResult.commercialTerms.tariffModifier < 0 ? 'text-green-600' : pricingResult.commercialTerms.tariffModifier > 0 ? 'text-red-600' : ''}`}>
                            {pricingResult.commercialTerms.tariffModifier}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tasa seguro:</span>
                          <span className="font-mono">{(pricingResult.commercialTerms.insuranceRate * 1000).toFixed(1)}‰</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pago */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Paga</label>
            <select
              name="paid_by"
              value={formData.paid_by}
              onChange={handleChange}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            >
              <option value="destino">Destinatario</option>
              <option value="origen">Remitente</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Condición de Pago</label>
            <select
              name="payment_terms"
              value={formData.payment_terms}
              onChange={handleChange}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            >
              <option value="contado">Contado</option>
              <option value="cuenta_corriente">Cuenta Corriente</option>
            </select>
          </div>
        </div>

        {/* Descripción de carga */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Descripción de la Carga</label>
          <textarea
            name="load_description"
            value={formData.load_description}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 resize-none"
            placeholder="Detalle del contenido..."
          />
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Observaciones</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 resize-none"
            placeholder="Notas adicionales..."
          />
        </div>

        {/* Fotos */}
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded">
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-3">Fotos</label>
          <div className="grid grid-cols-2 gap-4">
            {/* Foto Remito */}
            <div>
              <p className="text-xs text-neutral-600 mb-2">Foto del Remito</p>
              {remitoImageUrl ? (
                <div className="relative group">
                  <img 
                    src={remitoImageUrl} 
                    alt="Remito" 
                    className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90"
                    onClick={() => setImageModal({ url: remitoImageUrl, title: 'Foto del Remito' })}
                  />
                  <button
                    type="button"
                    onClick={() => remitoInputRef.current?.click()}
                    className="absolute bottom-2 right-2 h-7 px-2 text-xs bg-white/90 hover:bg-white border rounded flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" /> Cambiar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => remitoInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full h-32 border-2 border-dashed border-neutral-300 hover:border-orange-400 rounded flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-orange-500 transition-colors"
                >
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">Subir foto del remito</span>
                </button>
              )}
              <input
                ref={remitoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'remito');
                }}
              />
            </div>

            {/* Foto Carga */}
            <div>
              <p className="text-xs text-neutral-600 mb-2">Foto de la Carga</p>
              {cargoImageUrl ? (
                <div className="relative group">
                  <img 
                    src={cargoImageUrl} 
                    alt="Carga" 
                    className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90"
                    onClick={() => setImageModal({ url: cargoImageUrl, title: 'Foto de la Carga' })}
                  />
                  <button
                    type="button"
                    onClick={() => cargoInputRef.current?.click()}
                    className="absolute bottom-2 right-2 h-7 px-2 text-xs bg-white/90 hover:bg-white border rounded flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" /> Cambiar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => cargoInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full h-32 border-2 border-dashed border-neutral-300 hover:border-orange-400 rounded flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-orange-500 transition-colors"
                >
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">Subir foto de la carga</span>
                </button>
              )}
              <input
                ref={cargoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'cargo');
                }}
              />
            </div>
          </div>
          {isUploading && (
            <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              Subiendo imagen...
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-9 px-4 text-sm border border-neutral-200 hover:bg-neutral-50 rounded flex items-center gap-2"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-9 px-4 text-sm bg-neutral-900 hover:bg-neutral-800 text-white rounded flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar Cambios
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-9 px-4 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded flex items-center gap-2 ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </form>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">¿Eliminar este remito?</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Esta acción no se puede deshacer. Se eliminará el remito <strong>{remitoNumber}</strong> y toda su información asociada.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="h-9 px-4 text-sm border border-neutral-200 hover:bg-neutral-50 rounded"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-9 px-4 text-sm bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de imagen */}
      {imageModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setImageModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-neutral-300"
            >
              <X className="w-6 h-6" />
            </button>
            <p className="text-white text-sm mb-2">{imageModal.title}</p>
            <img 
              src={imageModal.url} 
              alt={imageModal.title}
              className="max-w-full max-h-[80vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
}


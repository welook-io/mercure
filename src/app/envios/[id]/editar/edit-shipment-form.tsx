"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Calculator, Trash2, Upload, Image as ImageIcon, X } from "lucide-react";
import Link from "next/link";

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
}

interface EditShipmentFormProps {
  shipment: ShipmentData;
  entities: Entity[];
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
  const [manualPrice, setManualPrice] = useState<string>('');
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
      
      if (result.pricing?.price > 0) {
        setNewQuotation({
          price: result.pricing.price,
          breakdown: result.pricing.breakdown || {},
        });
        setMessage({ type: 'success', text: `Nuevo precio: $${result.pricing.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` });
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
        router.push('/recepcion');
        router.refresh();
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
      const finalPrice = useManualPrice && manualPrice 
        ? parseFloat(manualPrice) 
        : newQuotation?.price;

      const newQuotationData = finalPrice && finalPrice > 0 ? {
        price: finalPrice,
        breakdown: newQuotation?.breakdown || {},
        isManual: useManualPrice,
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
        router.push('/recepcion');
        router.refresh();
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
          <Link 
            href="/recepcion"
            className="p-2 hover:bg-neutral-100 rounded text-neutral-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
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
                    setManualPrice('');
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
                  Flete: ${quotation.base_price.toLocaleString('es-AR')} + Seguro: ${quotation.insurance_cost.toLocaleString('es-AR')}
                </p>
              )}
            </div>
            
            {/* Precio manual */}
            {useManualPrice ? (
              <div className="bg-orange-50 border border-orange-200 rounded p-2">
                <label className="text-orange-700 text-xs block mb-1">Precio manual:</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-400 text-sm">$</span>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-8 pl-6 pr-2 text-sm font-bold text-orange-800 border border-orange-300 rounded focus:border-orange-500 focus:ring-0 bg-white"
                    step="0.01"
                    min="0"
                  />
                </div>
                {manualPrice && parseFloat(manualPrice) > 0 && (
                  <p className="text-xs text-orange-600 mt-1">Se guardará al confirmar</p>
                )}
              </div>
            ) : newQuotation ? (
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <span className="text-green-700 text-xs">Nuevo precio:</span>
                <p className="font-bold text-green-800">
                  ${newQuotation.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-green-600">Se guardará al confirmar</p>
              </div>
            ) : null}
          </div>
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
          <Link 
            href="/recepcion"
            className="h-9 px-4 text-sm border border-neutral-200 hover:bg-neutral-50 rounded flex items-center gap-2"
          >
            Cancelar
          </Link>
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


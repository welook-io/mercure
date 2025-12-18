"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Sparkles, CheckCircle2, AlertCircle, Calculator, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { ImageCapture, CapturedImage } from "./image-capture";

interface AnalysisData {
  deliveryNoteNumber: string | null;
  date: string | null;
  // Remitente
  senderId: number | null;
  senderName: string | null;
  senderCuit: string | null;
  senderAddress: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  // Destinatario
  recipientId: number | null;
  recipientName: string | null;
  recipientCuit: string | null;
  recipientAddress: string | null;
  recipientLocality: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  // Carga
  packageQuantity: number | null;
  weightKg: number | null;
  volumeM3: number | null;
  declaredValue: number | null;
  loadDescription: string | null;
  observations: string | null;
}

interface FormData {
  // Remito
  deliveryNoteNumber: string;
  date: string;
  origin: string; // Origen del envío
  // Carga (lo más importante)
  packageQuantity: string;
  weightKg: string;
  volumeM3: string;
  declaredValue: string;
  // Remitente (solo referencia)
  senderName: string;
  senderId: number | null;
  // Destinatario (cliente principal)
  recipientId: number | null;
  recipientName: string;
  recipientCuit: string;
  recipientAddress: string;
  recipientLocality: string;
  recipientPhone: string;
  recipientEmail: string;
  // Condiciones de pago
  paidBy: 'origen' | 'destino'; // Pagadero por origen (remitente) o destino (destinatario)
  paymentTerms: string; // contado, cuenta_corriente
  // Extras
  loadDescription: string;
  observations: string;
}

const ORIGINS = [
  { value: 'Buenos Aires', label: 'Buenos Aires' },
  { value: 'Córdoba', label: 'Córdoba' },
  { value: 'Mendoza', label: 'Mendoza' },
  { value: 'Rosario', label: 'Rosario' },
  { value: 'Tucumán', label: 'Tucumán' },
  { value: 'Salta', label: 'Salta' },
];

// Campos que necesitan confirmación (no se pudieron extraer automáticamente)
interface PendingFields {
  packageQuantity: boolean;
  weightKg: boolean;
  volumeM3: boolean;
  declaredValue: boolean;
  recipientAddress: boolean;
}

interface EntityMatch {
  id: number;
  legal_name: string;
  tax_id: string | null;
  address: string | null;
}

type RecipientStatus = 'pending' | 'found' | 'not_found' | 'new';

export default function NuevaRecepcionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pt-12">
          <div className="px-3 sm:px-4 py-4 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        </main>
      </div>
    }>
      <NuevaRecepcionContent />
    </Suspense>
  );
}

function NuevaRecepcionContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); // 'cotizar' para modo cotización
  const isCotizarMode = mode === 'cotizar';
  
  // Nueva gestión de imágenes con soporte para múltiples
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinkingText, setThinkingText] = useState<string>("");
  const [needsReview, setNeedsReview] = useState<Record<string, boolean>>({});
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});
  
  // Helpers para acceder a imágenes
  const remitoImages = capturedImages.filter(img => img.type === 'remito');
  const cargaImages = capturedImages.filter(img => img.type === 'carga');
  const hasImages = capturedImages.length > 0;

  // Estado para destinatario (cliente)
  const [recipientStatus, setRecipientStatus] = useState<RecipientStatus>('pending');
  const [recipientSuggestions, setRecipientSuggestions] = useState<EntityMatch[]>([]);
  
  // Estado para remitente (simple, solo para mostrar si se encontró)
  const [senderStatus, setSenderStatus] = useState<'pending' | 'found'>('pending');

  // Estado para pricing (árbol de decisión A/B/C)
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
  
  // Tarifa especial disponible
  interface SpecialTariff {
    id: number;
    name: string;
    description: string | null;
    condition_type: string;
    condition_values: Record<string, any>;
    pricing_type: string;
    pricing_values: Record<string, any>;
    origin: string | null;
    destination: string | null;
    priority: number;
    matches: boolean;
    matchReason?: string;
  }

  interface PricingInfo {
    path: 'A' | 'B' | 'C';
    pathName: string;
    tag: { color: 'green' | 'yellow' | 'red'; label: string; description: string };
    pricing: { 
      source: string; 
      price: number | null; 
      quotationId?: number;
      breakdown?: Record<string, number>;
      specialTariffId?: number;
    };
    validation?: { needsReview: boolean; reason?: string };
    commercialTerms?: {
      tariffType: string;
      tariffModifier: number;
      insuranceRate: number;
      creditDays?: number;
    };
    // Tarifas especiales disponibles para este cliente
    specialTariffs?: SpecialTariff[];
    // Tarifa especial aplicada automáticamente
    appliedSpecialTariff?: SpecialTariff;
    debug?: DebugInfo;
  }
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);
  const [showSpecialTariffs, setShowSpecialTariffs] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);
  
  // Campos que necesitan confirmación
  const [pendingFields, setPendingFields] = useState<PendingFields>({
    packageQuantity: false,
    weightKg: false,
    volumeM3: false,
    declaredValue: false,
    recipientAddress: false,
  });


  const [formData, setFormData] = useState<FormData>({
    // Remito
    deliveryNoteNumber: "",
    date: new Date().toISOString().split("T")[0],
    origin: "Buenos Aires", // Origen por defecto
    // Carga
    packageQuantity: "",
    weightKg: "",
    volumeM3: "",
    declaredValue: "",
    // Remitente
    senderName: "",
    senderId: null,
    // Destinatario
    recipientId: null,
    recipientName: "",
    recipientCuit: "",
    recipientAddress: "",
    recipientLocality: "",
    recipientPhone: "",
    recipientEmail: "",
    // Condiciones de pago
    paidBy: 'destino', // Por defecto paga el destinatario
    paymentTerms: "contado",
    // Extras
    loadDescription: "",
    observations: "",
  });
  
  // Marcar campo como confirmado (quitar el rojo)
  const confirmField = (field: keyof PendingFields) => {
    setPendingFields(prev => ({ ...prev, [field]: false }));
  };
  
  // Estilo para campos pendientes
  const getFieldClassName = (field: keyof PendingFields, baseClass: string = "h-8 text-sm") => {
    if (pendingFields[field]) {
      return `${baseClass} border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200`;
    }
    return baseClass;
  };


  // Buscar entidad por CUIT o nombre
  const searchEntity = async (cuit: string | null, name: string | null): Promise<{
    found: boolean;
    entity?: EntityMatch;
    suggestions?: EntityMatch[];
  }> => {
    const params = new URLSearchParams();
    if (cuit) params.append('cuit', cuit);
    if (name) params.append('name', name);

    const response = await fetch(`/api/search-entity?${params.toString()}`);
    const result = await response.json();
    return result;
  };

  // Seleccionar un destinatario de las sugerencias
  const selectRecipient = (entity: EntityMatch) => {
    setFormData(prev => ({
      ...prev,
      recipientId: entity.id,
      recipientName: entity.legal_name,
      recipientCuit: entity.tax_id || '',
      recipientAddress: entity.address || '',
    }));
    setRecipientStatus('found');
    setRecipientSuggestions([]);
    // Detectar pricing cuando se selecciona cliente
    detectPricing(entity.tax_id || undefined, entity.legal_name);
  };

  // Detectar camino de pricing (A/B/C)
  const detectPricing = async (cuit?: string, name?: string, forceRecalc = false) => {
    // Solo recalcular si tenemos cliente y datos de carga
    const hasCargo = formData.weightKg || formData.volumeM3 || formData.declaredValue;
    const hasClient = cuit || name || formData.recipientCuit || formData.recipientName;
    
    if (!hasClient && !forceRecalc) return;

    try {
      const response = await fetch('/api/detect-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientCuit: cuit || formData.recipientCuit,
          recipientName: name || formData.recipientName,
          destination: formData.recipientAddress || formData.recipientLocality,
          packageQuantity: formData.packageQuantity ? parseInt(formData.packageQuantity) : undefined,
          weightKg: formData.weightKg ? parseFloat(formData.weightKg) : undefined,
          volumeM3: formData.volumeM3 ? parseFloat(formData.volumeM3) : undefined,
          declaredValue: formData.declaredValue ? parseFloat(formData.declaredValue) : undefined,
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setPricingInfo(result);
        if (result.pricing?.price) {
          setCalculatedPrice(result.pricing.price);
        } else {
          setCalculatedPrice(null);
        }
      }
    } catch (error) {
      console.error('Error detecting pricing:', error);
    }
  };

  // Recalcular precio cuando cambian datos de carga (con debounce)
  useEffect(() => {
    // En modo cotización, siempre recalcular. En modo normal, solo si encontró cliente
    if (!isCotizarMode && recipientStatus !== 'found') return;
    
    const timer = setTimeout(() => {
      detectPricing(undefined, undefined, isCotizarMode);
    }, 500); // Debounce de 500ms
    
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.weightKg, formData.volumeM3, formData.declaredValue, formData.recipientLocality, isCotizarMode]);
  
  // Prefill data from URL params
  useEffect(() => {
    const prefillParam = searchParams.get('prefill');
    if (prefillParam) {
      try {
        const prefillData = JSON.parse(prefillParam);
        setFormData(prev => ({
          ...prev,
          ...prefillData
        }));
      } catch (e) {
        console.error('Error parsing prefill data:', e);
      }
    }
  }, [searchParams]);

  const analyzeImages = async () => {
    if (!hasImages) {
      setError("Cargá al menos una imagen para analizar");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setThinkingText("");
    setNeedsReview({});
    setReviewReasons({});
    setRecipientStatus('pending');
    setSenderStatus('pending');

    try {
      const formDataToSend = new FormData();
      
      // Agregar todas las imágenes de remito con comentarios
      remitoImages.forEach((img, idx) => {
        formDataToSend.append(`remito_${idx}`, img.file);
        if (img.comment) {
          formDataToSend.append(`remito_${idx}_comment`, img.comment);
        }
      });
      
      // Agregar todas las imágenes de carga con metadata y comentarios
      cargaImages.forEach((img, idx) => {
        formDataToSend.append(`carga_${idx}`, img.file);
        if (img.cargoMeta) {
          formDataToSend.append(`carga_${idx}_meta`, JSON.stringify(img.cargoMeta));
        }
        if (img.comment) {
          formDataToSend.append(`carga_${idx}_comment`, img.comment);
        }
      });
      
      // Mantener compatibilidad con API actual (primera de cada tipo)
      if (remitoImages.length > 0) {
        formDataToSend.append("remito", remitoImages[0].file);
      }
      if (cargaImages.length > 0) {
        formDataToSend.append("carga", cargaImages[0].file);
      }

      const response = await fetch("/api/analyze-reception", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al analizar las imágenes");
      }

      // Procesar el stream SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let data: AnalysisData | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;
                
                const event = JSON.parse(jsonStr);
                
                if (event.type === 'thinking') {
                  setThinkingText(prev => prev + event.text);
                } else if (event.type === 'text') {
                  // Ignorar el text incremental, usamos complete
                } else if (event.type === 'complete') {
                  data = event.data;
                  console.log('Análisis completo:', data);
                } else if (event.type === 'error') {
                  console.error('Error del stream:', event.error);
                  throw new Error(event.error);
                }
              } catch (e) {
                // Solo ignorar errores de parsing, no errores reales
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }
      }

      if (!data) {
        throw new Error("No se recibieron datos del análisis");
      }

      // Actualizar el formulario con los datos extraídos
      setFormData((prev) => ({
        ...prev,
        deliveryNoteNumber: data!.deliveryNoteNumber || prev.deliveryNoteNumber,
        date: data!.date || prev.date,
        // Carga
        packageQuantity: data!.packageQuantity?.toString() || prev.packageQuantity,
        weightKg: data!.weightKg?.toString() || prev.weightKg,
        volumeM3: (data as any).volumeM3?.toString() || prev.volumeM3,
        declaredValue: data!.declaredValue?.toString() || prev.declaredValue,
        // Remitente (solo nombre)
        senderId: data!.senderId || prev.senderId,
        senderName: data!.senderName || prev.senderName,
        // Destinatario
        recipientId: data!.recipientId || prev.recipientId,
        recipientName: data!.recipientName || prev.recipientName,
        recipientCuit: data!.recipientCuit || prev.recipientCuit,
        recipientAddress: data!.recipientAddress || prev.recipientAddress,
        recipientLocality: data!.recipientLocality || prev.recipientLocality,
        recipientPhone: data!.recipientPhone || prev.recipientPhone,
        recipientEmail: data!.recipientEmail || prev.recipientEmail,
        // Extras
        loadDescription: data!.loadDescription || prev.loadDescription,
        observations: data!.observations || prev.observations,
      }));
      
      // Marcar campos críticos que no se pudieron extraer
      setPendingFields({
        packageQuantity: !data.packageQuantity,
        weightKg: !data.weightKg,
        volumeM3: !(data as any).volumeM3,
        declaredValue: !data.declaredValue,
        recipientAddress: !data.recipientAddress,
      });

      // Guardar campos que necesitan revisión y sus razones
      if ((data as any).needsReview) {
        setNeedsReview((data as any).needsReview);
      }
      if ((data as any).reviewReasons) {
        setReviewReasons((data as any).reviewReasons);
      }

      // Si el LLM devolvió IDs, marcar como encontrado directamente
      if (data.recipientId) {
        setRecipientStatus('found');
        // Detectar pricing
        detectPricing(data.recipientCuit || undefined, data.recipientName || undefined);
      } else if (data.recipientName || data.recipientCuit) {
        // Buscar en DB si no devolvió ID
        const recipientResult = await searchEntity(data.recipientCuit, data.recipientName);
        
        if (recipientResult.found && recipientResult.entity) {
          setFormData(prev => ({
            ...prev,
            recipientId: recipientResult.entity!.id,
            recipientName: recipientResult.entity!.legal_name,
            recipientCuit: recipientResult.entity!.tax_id || prev.recipientCuit,
            recipientAddress: recipientResult.entity!.address || prev.recipientAddress,
          }));
          setRecipientStatus('found');
          // Detectar pricing
          detectPricing(recipientResult.entity!.tax_id || undefined, recipientResult.entity!.legal_name);
        } else if (recipientResult.suggestions && recipientResult.suggestions.length > 0) {
          setRecipientSuggestions(recipientResult.suggestions);
          setRecipientStatus('not_found');
        } else {
          setRecipientStatus('not_found');
        }
      }

      // Remitente: solo marcar si encontró ID (no es crítico)
      if (data.senderId) {
        setSenderStatus('found');
      } else {
        setSenderStatus('pending'); // No importa mucho si no lo encuentra
      }

      setAnalyzed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      // Validar campos críticos
      if (!formData.recipientName?.trim()) {
        throw new Error("El destinatario es requerido");
      }
      
      if (!formData.packageQuantity) {
        setPendingFields(prev => ({ ...prev, packageQuantity: true }));
        throw new Error("La cantidad de bultos es requerida");
      }
      
      if (!formData.declaredValue) {
        setPendingFields(prev => ({ ...prev, declaredValue: true }));
        throw new Error("El valor declarado es requerido");
      }
      
      if (!formData.recipientAddress?.trim()) {
        setPendingFields(prev => ({ ...prev, recipientAddress: true }));
        throw new Error("La dirección de entrega es requerida");
      }

      // Nota: No bloqueamos si no hay precio - se puede cotizar en destino

      // Preparar FormData para enviar
      const formDataToSend = new FormData();
      formDataToSend.append("data", JSON.stringify(formData));
      
      // Agregar todas las imágenes
      remitoImages.forEach((img, idx) => {
        formDataToSend.append(`remito_${idx}`, img.file);
      });
      cargaImages.forEach((img, idx) => {
        formDataToSend.append(`carga_${idx}`, img.file);
        if (img.cargoMeta) {
          formDataToSend.append(`carga_${idx}_meta`, JSON.stringify(img.cargoMeta));
        }
      });
      
      // Compatibilidad con API actual
      if (remitoImages.length > 0) formDataToSend.append("remito", remitoImages[0].file);
      if (cargaImages.length > 0) formDataToSend.append("carga", cargaImages[0].file);

      const response = await fetch("/api/save-reception", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al guardar la recepción");
      }

      // Redirigir a la lista de recepciones
      window.location.href = "/recepcion";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-3 mb-4">
            <Link href={isCotizarMode ? "/tarifas" : "/recepcion"}>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-medium text-neutral-900">
              {isCotizarMode ? "Cotizar Envío" : "Nueva Recepción"}
            </h1>
            {isCotizarMode && (
              <span className="text-xs text-neutral-400">Modo cotización - no guarda datos</span>
            )}
          </div>

          {/* Captura de imágenes - Solo en modo recepción */}
          {!isCotizarMode && (
            <>
              <div className="mb-4">
                <ImageCapture
                  images={capturedImages}
                  onImagesChange={setCapturedImages}
                />
              </div>

              {/* Botón analizar */}
              <div className="mb-6">
                <Button
                  onClick={analyzeImages}
                  disabled={isAnalyzing || !hasImages}
                  className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white rounded flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando imágenes...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analizar con IA
                    </>
                  )}
                </Button>
                
                {/* Panel de Thinking */}
                {isAnalyzing && thinkingText && (
                  <div className="mt-3 p-3 bg-neutral-900 rounded border border-neutral-700 max-h-48 overflow-y-auto" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                        Kalia está pensando...
                      </span>
                    </div>
                    <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {thinkingText}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Instrucciones modo cotización */}
          {isCotizarMode && (
            <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 rounded flex items-center gap-2">
              <Calculator className="h-4 w-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">
                Completá los datos de la carga y el destino para ver el precio
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {analyzed && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✓ Análisis completado. Verificá los datos y completá los faltantes.
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            <div className="border border-neutral-200 rounded overflow-hidden">
              {/* Datos del remito */}
              <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Datos del Remito
                </span>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Nº Remito</Label>
                  <Input
                    name="deliveryNoteNumber"
                    value={formData.deliveryNoteNumber}
                    onChange={handleInputChange}
                    className="h-8 text-sm"
                    placeholder="0001-00000123"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Fecha</Label>
                  <Input
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Origen</Label>
                  <select
                    name="origin"
                    value={formData.origin}
                    onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                    className="w-full h-8 px-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
                  >
                    {ORIGINS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block flex items-center gap-1">
                    Bultos
                    {pendingFields.packageQuantity && <span className="text-red-500">*</span>}
                    {needsReview.packageQuantity && formData.packageQuantity && (
                      <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                        Chequear
                      </span>
                    )}
                  </Label>
                  <Input
                    name="packageQuantity"
                    type="number"
                    value={formData.packageQuantity}
                    onChange={(e) => {
                      handleInputChange(e);
                      if (e.target.value) {
                        confirmField('packageQuantity');
                        setNeedsReview(prev => ({ ...prev, packageQuantity: false }));
                      }
                    }}
                    className={`${getFieldClassName('packageQuantity')} ${needsReview.packageQuantity ? 'border-amber-300 bg-amber-50' : ''}`}
                    placeholder="Requerido"
                  />
                  {needsReview.packageQuantity && reviewReasons.packageQuantity && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {reviewReasons.packageQuantity}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1 block flex items-center gap-1">
                    Peso (kg)
                    {pendingFields.weightKg && <span className="text-red-500">*</span>}
                    {needsReview.weightKg && formData.weightKg && (
                      <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                        Chequear
                      </span>
                    )}
                  </Label>
                  <Input
                    name="weightKg"
                    type="number"
                    step="0.1"
                    value={formData.weightKg}
                    onChange={(e) => {
                      handleInputChange(e);
                      if (e.target.value) {
                        confirmField('weightKg');
                        setNeedsReview(prev => ({ ...prev, weightKg: false }));
                      }
                    }}
                    className={`${getFieldClassName('weightKg')} ${needsReview.weightKg ? 'border-amber-300 bg-amber-50' : ''}`}
                    placeholder="Requerido"
                  />
                  {needsReview.weightKg && reviewReasons.weightKg && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {reviewReasons.weightKg}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1 block flex items-center gap-1">
                    M³
                    {pendingFields.volumeM3 && <span className="text-red-500">*</span>}
                    {needsReview.volumeM3 && formData.volumeM3 && (
                      <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                        Chequear
                      </span>
                    )}
                  </Label>
                  <Input
                    name="volumeM3"
                    type="number"
                    step="0.01"
                    value={formData.volumeM3}
                    onChange={(e) => {
                      handleInputChange(e);
                      if (e.target.value) {
                        confirmField('volumeM3');
                        setNeedsReview(prev => ({ ...prev, volumeM3: false }));
                      }
                    }}
                    className={`${getFieldClassName('volumeM3')} ${needsReview.volumeM3 ? 'border-amber-300 bg-amber-50' : ''}`}
                    placeholder="Requerido"
                  />
                  {needsReview.volumeM3 && reviewReasons.volumeM3 && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {reviewReasons.volumeM3}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1 block flex items-center gap-1">
                    Valor Declarado
                    {pendingFields.declaredValue && <span className="text-red-500">*</span>}
                    {needsReview.declaredValue && formData.declaredValue && (
                      <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                        Chequear
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">$</span>
                    <Input
                      name="declaredValue"
                      type="number"
                      step="0.01"
                      value={formData.declaredValue}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (e.target.value) {
                          confirmField('declaredValue');
                          setNeedsReview(prev => ({ ...prev, declaredValue: false }));
                        }
                      }}
                      className={`${getFieldClassName('declaredValue')} pl-5 ${needsReview.declaredValue ? 'border-amber-300 bg-amber-50' : ''}`}
                      placeholder="Requerido"
                    />
                  </div>
                  {needsReview.declaredValue && reviewReasons.declaredValue && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {reviewReasons.declaredValue}
                    </p>
                  )}
                </div>
              </div>

              {/* Remitente (simple) */}
              <div className="bg-neutral-50 px-3 py-2 border-t border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Origen / Remitente
                </span>
              </div>
              <div className="p-3">
                <Label className="text-xs mb-1 block">Remitente</Label>
                <Input
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleInputChange}
                  className="h-8 text-sm"
                  placeholder="Nombre de quien envía (opcional)"
                />
              </div>

              {/* Destinatario (Cliente) */}
              <div className="bg-neutral-50 px-3 py-2 border-t border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Destino / Cliente
                </span>
                <div className="flex items-center gap-2">
                  {recipientStatus === 'found' && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Existente
                    </span>
                  )}
                  {/* TAG de Pricing */}
                  {pricingInfo && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      pricingInfo.tag.color === 'green' 
                        ? 'bg-green-100 text-green-800' 
                        : pricingInfo.tag.color === 'yellow'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {pricingInfo.tag.label}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Alerta de pricing (simplificada) */}
              {pricingInfo && (
                <div className={`px-3 py-1.5 border-b text-xs ${
                  pricingInfo.tag.color === 'green' 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : pricingInfo.tag.color === 'yellow'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {pricingInfo.tag.description}
                  {pricingInfo.validation?.needsReview && pricingInfo.validation.reason && (
                    <span className="ml-2 font-medium">⚠️ {pricingInfo.validation.reason}</span>
                  )}
                </div>
              )}
              
              {/* Tarifas especiales disponibles */}
              {pricingInfo?.specialTariffs && pricingInfo.specialTariffs.length > 0 && (
                <div className="px-3 py-2 bg-orange-50 border-b border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-orange-800 flex items-center gap-1">
                      ⭐ Arreglos disponibles para este cliente
                      {pricingInfo.appliedSpecialTariff && (
                        <span className="ml-2 px-1.5 py-0.5 bg-orange-500 text-white rounded text-[10px]">
                          Aplicado: {pricingInfo.appliedSpecialTariff.name}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSpecialTariffs(!showSpecialTariffs)}
                      className="text-xs text-orange-600 hover:text-orange-800"
                    >
                      {showSpecialTariffs ? 'Ocultar' : 'Ver todos'}
                    </button>
                  </div>
                  
                  {showSpecialTariffs && (
                    <div className="space-y-1.5 mt-2">
                      {pricingInfo.specialTariffs.map((st) => (
                        <div
                          key={st.id}
                          className={`p-2 rounded border text-xs ${
                            st.matches 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-neutral-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{st.name}</span>
                            <span className={`px-1.5 py-0.5 rounded ${
                              st.matches 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-neutral-100 text-neutral-500'
                            }`}>
                              {st.matches ? '✓ Aplica' : 'No aplica'}
                            </span>
                          </div>
                          {st.matchReason && (
                            <p className="text-neutral-500 mt-0.5">{st.matchReason}</p>
                          )}
                          {st.description && (
                            <p className="text-neutral-400 mt-0.5">{st.description}</p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-400">
                            <span>
                              Precio: {st.pricing_type === 'fijo' 
                                ? `$${(st.pricing_values.precio || 0).toLocaleString()}`
                                : st.pricing_type === 'por_kg'
                                ? `$${st.pricing_values.precio_kg}/kg`
                                : st.pricing_type === 'descuento_porcentaje'
                                ? `${st.pricing_values.porcentaje}%`
                                : st.pricing_type === 'descuento_monto'
                                ? `-$${Math.abs(st.pricing_values.monto || 0).toLocaleString()}`
                                : '-'
                              }
                            </span>
                            {st.origin && <span>• Desde: {st.origin}</span>}
                            {st.destination && <span>• A: {st.destination}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Sugerencias de destinatario */}
              {recipientStatus === 'not_found' && recipientSuggestions.length > 0 && (
                <div className="p-3 bg-amber-50 border-b border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-amber-800 font-medium mb-2">
                        ¿Es alguno de estos clientes?
                      </p>
                      <div className="space-y-1">
                        {recipientSuggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => selectRecipient(s)}
                            className="block w-full text-left px-2 py-1.5 text-xs bg-white rounded border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            <span className="font-medium">{s.legal_name}</span>
                            {s.tax_id && <span className="text-neutral-500 ml-2">CUIT: {s.tax_id}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs mb-1 block">Cliente / Razón Social</Label>
                    <Input
                      name="recipientName"
                      value={formData.recipientName}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                      placeholder="Nombre del cliente"
                      disabled={recipientStatus === 'found'}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Teléfono</Label>
                    <Input
                      name="recipientPhone"
                      value={formData.recipientPhone}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                      placeholder="011-1234-5678"
                      disabled={recipientStatus === 'found'}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs mb-1 block flex items-center gap-1">
                      Dirección de entrega
                      {pendingFields.recipientAddress && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      name="recipientAddress"
                      value={formData.recipientAddress}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (e.target.value) confirmField('recipientAddress');
                      }}
                      className={getFieldClassName('recipientAddress')}
                      placeholder="Calle, número, piso, etc."
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Localidad</Label>
                    <Input
                      name="recipientLocality"
                      value={formData.recipientLocality}
                      onChange={handleInputChange}
                      className="h-8 text-sm"
                      placeholder="Ciudad / Localidad"
                    />
                  </div>
                </div>
              </div>

              {/* Condiciones de Pago y Pricing */}
              <div className="bg-neutral-50 px-3 py-2 border-t border-b border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Condiciones de Pago
                </span>
                <div className="flex items-center gap-3">
                  {pricingInfo && pricingInfo.pricing.breakdown && (
                    <button
                      type="button"
                      onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                      className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                    >
                      {showFormulaDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      Ver fórmula
                    </button>
                  )}
                  {calculatedPrice && calculatedPrice > 0 && (
                    <span className="text-lg font-bold text-neutral-900">
                      ${calculatedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Detalle del cálculo de pricing (colapsable) */}
              {showFormulaDetails && pricingInfo && (
                <div className="px-3 py-2 bg-neutral-100 border-b border-neutral-200 text-xs overflow-x-auto">
                  {pricingInfo.debug ? (
                    <div className="space-y-3">
                      {/* Decisión de peso */}
                      <div className="bg-white p-2 rounded border border-neutral-200">
                        <div className="font-medium text-neutral-700 mb-1">📐 Decisión de peso:</div>
                        <div className="text-neutral-600 mb-2">{pricingInfo.debug.decision.explicacion}</div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className={`p-1 rounded ${pricingInfo.debug.decision.criterioUsado === 'PESO_REAL' ? 'bg-green-100 text-green-800 font-medium' : 'bg-neutral-50'}`}>
                            <div className="text-[10px] uppercase">Peso Real</div>
                            <div className="font-mono">{pricingInfo.debug.decision.pesoReal} kg</div>
                          </div>
                          <div className={`p-1 rounded ${pricingInfo.debug.decision.criterioUsado === 'PESO_VOLUMETRICO' ? 'bg-green-100 text-green-800 font-medium' : 'bg-neutral-50'}`}>
                            <div className="text-[10px] uppercase">Peso Volum.</div>
                            <div className="font-mono">{pricingInfo.debug.decision.pesoVolumetrico.toFixed(1)} kg</div>
                          </div>
                          <div className="p-1 rounded bg-blue-100 text-blue-800 font-medium">
                            <div className="text-[10px] uppercase">→ A Cobrar</div>
                            <div className="font-mono">{pricingInfo.debug.decision.pesoACobrar} kg</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tarifa encontrada */}
                      <div className="bg-white p-2 rounded border border-neutral-200">
                        <div className="font-medium text-neutral-700 mb-1">📋 Tarifa:</div>
                        {pricingInfo.debug.tarifa.encontrada ? (
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Ruta:</span>
                              <span className="font-medium">{pricingInfo.debug.tarifa.origen} → {pricingInfo.debug.tarifa.destino}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Rango:</span>
                              <span className="font-mono">{pricingInfo.debug.tarifa.rangoKg} kg</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Precio lista:</span>
                              <span className="font-mono font-medium">${pricingInfo.debug.tarifa.precioLista?.toLocaleString('es-AR')}</span>
                            </div>
                            {pricingInfo.debug.tarifa.queryUsada && (
                              <div className="text-[10px] text-neutral-400 mt-1 p-1 bg-neutral-50 rounded font-mono">
                                {pricingInfo.debug.tarifa.queryUsada}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-red-600">
                            ⚠️ No se encontró tarifa
                            {pricingInfo.debug.tarifa.queryUsada && (
                              <div className="text-[10px] text-neutral-400 mt-1 p-1 bg-neutral-50 rounded font-mono">
                                {pricingInfo.debug.tarifa.queryUsada}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Fórmula del cálculo */}
                      <div className="bg-white p-2 rounded border border-neutral-200">
                        <div className="font-medium text-neutral-700 mb-1">🧮 Cálculo:</div>
                        <div className="p-2 bg-neutral-800 text-green-400 rounded font-mono text-[11px] whitespace-pre-wrap">
                          {pricingInfo.debug.calculo.formula}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                          <div className="flex justify-between">
                            <span>Flete lista:</span>
                            <span className="font-mono">${pricingInfo.debug.calculo.fleteLista.toLocaleString('es-AR')}</span>
                          </div>
                          {pricingInfo.debug.calculo.modificador !== undefined && (
                            <div className="flex justify-between">
                              <span>Modificador:</span>
                              <span className={`font-mono ${pricingInfo.debug.calculo.modificador < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pricingInfo.debug.calculo.modificador}%
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Seguro ({(pricingInfo.debug.calculo.tasaSeguro * 1000).toFixed(0)}‰):</span>
                            <span className="font-mono">${pricingInfo.debug.calculo.seguro.toLocaleString('es-AR')}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>TOTAL:</span>
                            <span className="font-mono">${pricingInfo.debug.calculo.total.toLocaleString('es-AR')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : pricingInfo.pricing.breakdown ? (
                    /* Fallback al formato anterior si no hay debug */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                      <div className="space-y-1">
                        <div className="font-medium text-neutral-600 mb-1">Datos de carga:</div>
                        <div className="flex justify-between">
                          <span>Peso real:</span>
                          <span className="font-mono">{formData.weightKg || 0} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Volumen:</span>
                          <span className="font-mono">{formData.volumeM3 || 0} m³</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-neutral-600 mb-1">Desglose:</div>
                        {Object.entries(pricingInfo.pricing.breakdown).map(([key, value]) => (
                          typeof value === 'number' && (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="font-mono">${Math.abs(value).toLocaleString('es-AR')}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-neutral-500">Sin datos de cotización</div>
                  )}
                </div>
              )}

              <div className="p-3 space-y-3">
                {/* Switch de quién paga */}
                <div>
                  <Label className="text-xs mb-2 block">¿Quién paga el flete?</Label>
                  <div className="inline-flex rounded-md border border-neutral-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, paidBy: 'origen' }))}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        formData.paidBy === 'origen'
                          ? 'bg-orange-500 text-white'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      Remitente
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, paidBy: 'destino' }))}
                      className={`px-4 py-2 text-sm font-medium transition-colors border-l border-neutral-200 ${
                        formData.paidBy === 'destino'
                          ? 'bg-orange-500 text-white'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      Destinatario
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    {formData.paidBy === 'origen' 
                      ? '→ El remitente abona en origen' 
                      : '→ El destinatario abona al recibir'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Condición</Label>
                    <select
                      name="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                      className="h-8 w-full px-2 text-sm border border-neutral-200 rounded bg-white focus:border-neutral-400 focus:outline-none"
                    >
                      <option value="contado">Contado (Contra entrega)</option>
                      <option value="cuenta_corriente">Cuenta Corriente</option>
                    </select>
                  </div>
                  {formData.paymentTerms === 'contado' && calculatedPrice && (
                    <div className="flex items-end">
                      <div className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm font-bold">
                        COBRAR: ${calculatedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                  {pricingInfo?.path === 'A' && (
                    <div className="flex items-end">
                      <div className="px-3 py-1.5 bg-green-100 border border-green-200 rounded text-xs text-green-800">
                        Facturar a fin de mes (Cta Cte)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción de la carga */}
              <div className="bg-neutral-50 px-3 py-2 border-t border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Descripción de la Carga
                </span>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Descripción</Label>
                  <textarea
                    name="loadDescription"
                    value={formData.loadDescription}
                    onChange={handleInputChange}
                    className="w-full h-20 px-3 py-2 text-sm border border-neutral-200 rounded resize-none focus:outline-none focus:border-neutral-400"
                    placeholder="Descripción de la mercadería..."
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Observaciones</Label>
                  <textarea
                    name="observations"
                    value={formData.observations}
                    onChange={handleInputChange}
                    className="w-full h-20 px-3 py-2 text-sm border border-neutral-200 rounded resize-none focus:outline-none focus:border-neutral-400"
                    placeholder="Notas sobre el estado de la carga..."
                  />
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 mt-4">
              <Link href={isCotizarMode ? "/tarifas" : "/recepcion"}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-3 text-sm"
                >
                  {isCotizarMode ? "Volver" : "Cancelar"}
                </Button>
              </Link>
              {isCotizarMode ? (
                <Link href={`/recepcion/nueva?${new URLSearchParams({
                  prefill: JSON.stringify({
                    recipientName: formData.recipientName,
                    recipientCuit: formData.recipientCuit,
                    recipientAddress: formData.recipientAddress,
                    recipientLocality: formData.recipientLocality,
                    packageQuantity: formData.packageQuantity,
                    weightKg: formData.weightKg,
                    volumeM3: formData.volumeM3,
                    declaredValue: formData.declaredValue,
                  })
                }).toString()}`}>
                  <Button
                    type="button"
                    className="h-8 px-4 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded"
                  >
                    Crear Remito con estos datos
                  </Button>
                </Link>
              ) : (
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-8 px-4 text-sm bg-neutral-900 hover:bg-neutral-800 text-white rounded"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    "Registrar Recepción"
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}




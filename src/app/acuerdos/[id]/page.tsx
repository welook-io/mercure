"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Loader2, CheckCircle, XCircle, Settings, 
  Building, User, Calendar, FileText, AlertTriangle 
} from "lucide-react";
import Link from "next/link";
import { AGREEMENT_STATUS_LABELS, TARIFF_TYPE_LABELS, CREDIT_TERMS_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

interface AgreementDetail {
  id: number;
  entity_id: number | null;
  new_entity_name: string | null;
  new_entity_cuit: string | null;
  new_entity_address: string | null;
  new_entity_phone: string | null;
  new_entity_email: string | null;
  new_entity_contact_name: string | null;
  requested_tariff_type: string;
  requested_tariff_modifier: number;
  requested_insurance_rate: number;
  requested_credit_terms: string;
  requested_credit_days: number;
  requested_payment_method: string;
  justification: string;
  expected_monthly_volume: string | null;
  status: string;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  configured_by: string | null;
  configured_at: string | null;
  entity: { id: number; legal_name: string; tax_id: string | null; address: string | null } | null;
}

function getStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case 'pending_review': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    case 'configured': return 'info';
    default: return 'default';
  }
}

export default function AcuerdoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const [agreement, setAgreement] = useState<AgreementDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgreement();
  }, [params.id]);

  const loadAgreement = async () => {
    try {
      const response = await fetch(`/api/commercial-agreements/${params.id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar');
      }
      
      setAgreement(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'configure') => {
    if (!agreement) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/commercial-agreements/${agreement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNotes }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al procesar');
      }

      // Recargar o redirigir
      if (action === 'configure') {
        router.push('/acuerdos');
      } else {
        await loadAgreement();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pt-12 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </main>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pt-12 px-4 py-8 text-center">
          <p className="text-neutral-500">Solicitud no encontrada</p>
          <Link href="/acuerdos" className="text-orange-500 hover:underline text-sm mt-2 inline-block">
            Volver a la lista
          </Link>
        </main>
      </div>
    );
  }

  const clientName = agreement.entity?.legal_name || agreement.new_entity_name || 'Cliente';
  const clientCuit = agreement.entity?.tax_id || agreement.new_entity_cuit;
  const clientAddress = agreement.entity?.address || agreement.new_entity_address;
  const isNewClient = !agreement.entity_id;
  const isExceptional = agreement.requested_tariff_type !== 'base' || agreement.requested_tariff_modifier < 0;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <Link href="/acuerdos">
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-medium text-neutral-900">
                  Acuerdo #{agreement.id}
                </h1>
                <p className="text-xs text-neutral-500">{timeAgo(agreement.requested_at)}</p>
              </div>
            </div>
            <Badge variant={getStatusVariant(agreement.status)} className="text-sm">
              {AGREEMENT_STATUS_LABELS[agreement.status]}
            </Badge>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Cliente */}
          <div className="border border-neutral-200 rounded overflow-hidden mb-4">
            <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Cliente
              </span>
              {isNewClient && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                  NUEVO
                </span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-neutral-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{clientName}</p>
                  {clientCuit && <p className="text-sm text-neutral-500 font-mono">{clientCuit}</p>}
                  {clientAddress && <p className="text-sm text-neutral-500">{clientAddress}</p>}
                  {agreement.new_entity_phone && (
                    <p className="text-sm text-neutral-500">{agreement.new_entity_phone}</p>
                  )}
                  {agreement.new_entity_email && (
                    <p className="text-sm text-neutral-500">{agreement.new_entity_email}</p>
                  )}
                  {agreement.new_entity_contact_name && (
                    <p className="text-sm text-neutral-400">Contacto: {agreement.new_entity_contact_name}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Condiciones Solicitadas */}
          <div className="border border-neutral-200 rounded overflow-hidden mb-4">
            <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200 flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Condiciones Solicitadas
              </span>
              {isExceptional && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  EXCEPCIONAL
                </span>
              )}
            </div>
            <div className="p-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Tipo de Tarifa</p>
                  <p className="font-medium">{TARIFF_TYPE_LABELS[agreement.requested_tariff_type]}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Modificador</p>
                  <p className={`font-medium ${agreement.requested_tariff_modifier < 0 ? 'text-green-600' : agreement.requested_tariff_modifier > 0 ? 'text-red-600' : ''}`}>
                    {agreement.requested_tariff_modifier > 0 ? '+' : ''}{agreement.requested_tariff_modifier}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Condición de Pago</p>
                  <p className="font-medium">{CREDIT_TERMS_LABELS[agreement.requested_credit_terms]}</p>
                </div>
                {agreement.requested_credit_days > 0 && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Días de Crédito</p>
                    <p className="font-medium">{agreement.requested_credit_days} días</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Forma de Pago</p>
                  <p className="font-medium capitalize">{agreement.requested_payment_method}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Seguro</p>
                  <p className="font-medium">{(agreement.requested_insurance_rate * 1000).toFixed(1)}‰</p>
                </div>
              </div>
            </div>
          </div>

          {/* Justificación */}
          <div className="border border-neutral-200 rounded overflow-hidden mb-4">
            <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Justificación del Comercial
              </span>
            </div>
            <div className="p-3">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-neutral-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                    {agreement.justification}
                  </p>
                  {agreement.expected_monthly_volume && (
                    <p className="text-sm text-neutral-500 mt-2">
                      <strong>Volumen esperado:</strong> {agreement.expected_monthly_volume}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Historial */}
          <div className="border border-neutral-200 rounded overflow-hidden mb-4">
            <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Historial
              </span>
            </div>
            <div className="p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-neutral-400" />
                <span className="text-neutral-600">Solicitado por comercial</span>
                <span className="text-neutral-400 text-xs ml-auto">{timeAgo(agreement.requested_at)}</span>
              </div>
              
              {agreement.reviewed_at && (
                <div className="flex items-center gap-2">
                  {agreement.status === 'approved' || agreement.status === 'configured' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-neutral-600">
                    {agreement.status === 'rejected' ? 'Rechazado' : 'Aprobado'} por gerencia
                  </span>
                  <span className="text-neutral-400 text-xs ml-auto">{timeAgo(agreement.reviewed_at)}</span>
                </div>
              )}

              {agreement.review_notes && (
                <div className="ml-6 p-2 bg-neutral-50 rounded text-xs text-neutral-600 italic">
                  "{agreement.review_notes}"
                </div>
              )}

              {agreement.configured_at && (
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-500" />
                  <span className="text-neutral-600">Configurado en sistema</span>
                  <span className="text-neutral-400 text-xs ml-auto">{timeAgo(agreement.configured_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Acciones según estado */}
          {agreement.status === 'pending_review' && (
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-amber-50 px-3 py-2 border-b border-amber-200">
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                  Acción Requerida: Revisión de Gerencia
                </span>
              </div>
              <div className="p-3 space-y-3">
                <div>
                  <label className="text-xs text-neutral-600 mb-1 block">
                    Notas de revisión (opcional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full h-20 px-3 py-2 text-sm border border-neutral-200 rounded resize-none focus:outline-none focus:border-neutral-400"
                    placeholder="Comentarios sobre la decisión..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => handleAction('reject')}
                    disabled={isProcessing}
                    className="h-8 px-4 text-sm bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                    Rechazar
                  </Button>
                  <Button
                    onClick={() => handleAction('approve')}
                    disabled={isProcessing}
                    className="h-8 px-4 text-sm bg-green-500 hover:bg-green-600 text-white"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                    Aprobar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {agreement.status === 'approved' && (
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-green-50 px-3 py-2 border-b border-green-200">
                <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
                  Acción Requerida: Configuración en Sistema
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm text-neutral-600 mb-3">
                  Este acuerdo fue aprobado y está listo para ser configurado en el sistema.
                  {isNewClient && " Se creará el cliente y sus condiciones comerciales."}
                </p>
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleAction('configure')}
                    disabled={isProcessing}
                    className="h-8 px-4 text-sm bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4 mr-1" />}
                    Configurar en Sistema
                  </Button>
                </div>
              </div>
            </div>
          )}

          {agreement.status === 'rejected' && (
            <div className="border border-red-200 rounded overflow-hidden bg-red-50">
              <div className="p-3 text-sm text-red-700">
                <XCircle className="h-5 w-5 inline mr-2" />
                Esta solicitud fue rechazada. El comercial puede crear una nueva solicitud con condiciones ajustadas.
              </div>
            </div>
          )}

          {agreement.status === 'configured' && (
            <div className="border border-blue-200 rounded overflow-hidden bg-blue-50">
              <div className="p-3 text-sm text-blue-700">
                <CheckCircle className="h-5 w-5 inline mr-2" />
                Este acuerdo ya está configurado en el sistema y operativo.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}














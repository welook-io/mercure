import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { AGREEMENT_STATUS_LABELS, TARIFF_TYPE_LABELS, CREDIT_TERMS_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import { FileText, Clock, CheckCircle, XCircle, Settings } from "lucide-react";

interface AgreementRequest {
  id: number;
  entity_id: number | null;
  new_entity_name: string | null;
  new_entity_cuit: string | null;
  requested_tariff_type: string;
  requested_tariff_modifier: number;
  requested_credit_terms: string;
  requested_credit_days: number;
  justification: string;
  expected_monthly_volume: string | null;
  status: string;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  entity: { id: number; legal_name: string; tax_id: string | null } | null;
}

async function getAgreementRequests() {
  const { data } = await supabase
    .from('mercure_commercial_agreement_requests')
    .select(`
      *,
      entity:mercure_entities(id, legal_name, tax_id)
    `)
    .order('created_at', { ascending: false });
  return (data || []) as AgreementRequest[];
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

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending_review': return <Clock className="h-4 w-4" />;
    case 'approved': return <CheckCircle className="h-4 w-4" />;
    case 'rejected': return <XCircle className="h-4 w-4" />;
    case 'configured': return <Settings className="h-4 w-4" />;
    default: return null;
  }
}

export default async function AcuerdosPage() {
  await requireAuth("/acuerdos");

  const requests = await getAgreementRequests();
  
  const pendingCount = requests.filter(r => r.status === 'pending_review').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-neutral-400" />
              <div>
                <h1 className="text-lg font-medium text-neutral-900">Acuerdos Comerciales</h1>
                <p className="text-xs text-neutral-500">
                  {pendingCount > 0 && <span className="text-orange-600 font-medium">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>}
                  {pendingCount > 0 && approvedCount > 0 && ' · '}
                  {approvedCount > 0 && <span className="text-green-600">{approvedCount} aprobado{approvedCount !== 1 ? 's' : ''} sin configurar</span>}
                </p>
              </div>
            </div>
            <Link href="/acuerdos/nuevo">
              <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto">
                + Nuevo Acuerdo
              </Button>
            </Link>
          </div>

          {/* Explicación del workflow */}
          <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-600">
            <p className="font-medium text-neutral-700 mb-1">Circuito de control:</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">1. Comercial solicita</span>
              <span className="text-neutral-400">→</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">2. Gerencia aprueba</span>
              <span className="text-neutral-400">→</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">3. Admin configura</span>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="border border-neutral-200 rounded p-8 text-center">
              <FileText className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-neutral-500 text-sm">No hay solicitudes de acuerdos</p>
              <p className="text-neutral-400 text-xs mt-1">Los comerciales pueden crear nuevas solicitudes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => {
                const clientName = r.entity?.legal_name || r.new_entity_name || 'Cliente nuevo';
                const clientCuit = r.entity?.tax_id || r.new_entity_cuit;
                const isNew = !r.entity_id;
                
                return (
                  <Link key={r.id} href={`/acuerdos/${r.id}`}>
                    <div className="border border-neutral-200 rounded p-3 hover:bg-neutral-50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-neutral-900 truncate">
                              {clientName}
                            </span>
                            {isNew && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded shrink-0">
                                NUEVO
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                            {clientCuit && <span className="font-mono">{clientCuit}</span>}
                            <span>·</span>
                            <span>{TARIFF_TYPE_LABELS[r.requested_tariff_type] || r.requested_tariff_type}</span>
                            {r.requested_tariff_modifier !== 0 && (
                              <span className={r.requested_tariff_modifier < 0 ? 'text-green-600' : 'text-red-600'}>
                                ({r.requested_tariff_modifier > 0 ? '+' : ''}{r.requested_tariff_modifier}%)
                              </span>
                            )}
                            <span>·</span>
                            <span>{CREDIT_TERMS_LABELS[r.requested_credit_terms]}</span>
                            {r.requested_credit_days > 0 && (
                              <span>({r.requested_credit_days} días)</span>
                            )}
                          </div>
                          
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-1">
                            {r.justification}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={getStatusVariant(r.status)} className="flex items-center gap-1">
                            {getStatusIcon(r.status)}
                            {AGREEMENT_STATUS_LABELS[r.status]}
                          </Badge>
                          <span className="text-[10px] text-neutral-400">
                            {timeAgo(r.requested_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}



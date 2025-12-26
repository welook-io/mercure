"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  getClientShipments, 
  getClientSettlements,
  generateSettlement
} from "./actions";
import { 
  FileText, 
  Check, 
  Loader2, 
  Download, 
  History,
  Zap,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  generada: 'Generada',
  enviada: 'Enviada',
  conformada: 'Conformada',
  disputada: 'Disputada',
  facturada: 'Facturada',
  pagada: 'Pagada',
  anulada: 'Anulada',
};

interface ClientDetailProps {
  clientId: number;
  clientName: string;
  clientTaxId: string | null;
}

interface Shipment {
  id: number;
  delivery_note_number: string | null;
  created_at: string;
  sender_name: string; // Quien envió al cliente (el cliente es el destinatario)
  origin: string;
  destination: string;
  package_quantity: number | null;
  weight_kg: number | null;
  declared_value: number | null;
  calculated_amount: number;
  quotation_id: string | null;
}

interface Settlement {
  id: number;
  settlement_number: number;
  settlement_date: string;
  total_amount: number;
  status: string;
  invoice_number: string | null;
  invoice_pdf_url: string | null;
  cae: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string, includeTime = false): string {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return new Date(date).toLocaleDateString('es-AR', options);
}

export function ClientDetail({ clientId, clientName, clientTaxId }: ClientDetailProps) {
  const router = useRouter();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'remitos' | 'historico'>('remitos');
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [facturando, setFacturando] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const mappedShipments = await getClientShipments(clientId);
        setShipments(mappedShipments as Shipment[]);
        setSelectedShipments(new Set(mappedShipments.map(s => s.id)));

        const settlementsData = await getClientSettlements(clientId);
        setSettlements(settlementsData as Settlement[]);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [clientId]);

  const toggleShipment = (id: number) => {
    const newSelection = new Set(selectedShipments);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedShipments(newSelection);
  };

  const toggleAll = () => {
    if (selectedShipments.size === shipments.length) {
      setSelectedShipments(new Set());
    } else {
      setSelectedShipments(new Set(shipments.map(s => s.id)));
    }
  };

  const selectedTotal = shipments
    .filter(s => selectedShipments.has(s.id))
    .reduce((acc, s) => acc + s.calculated_amount, 0);

  const handleGenerateSettlement = async () => {
    if (selectedShipments.size === 0) return;

    setGenerating(true);
    try {
      const selectedShipmentsData = shipments.filter(s => selectedShipments.has(s.id));
      
      const settlement = await generateSettlement(
        clientId,
        selectedShipmentsData,
        user?.id || 'unknown',
        user?.fullName || user?.firstName || 'Usuario'
      );

      router.push(`/liquidaciones/${settlement.id}`);
    } catch (error) {
      console.error('Error generando liquidación:', error);
      alert('Error al generar la liquidación');
    } finally {
      setGenerating(false);
    }
  };

  const handleFacturar = async (settlementId: number) => {
    if (!clientTaxId) {
      alert('El cliente no tiene CUIT cargado');
      return;
    }

    setFacturando(settlementId);
    try {
      const response = await fetch('/api/afip/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_id: settlementId,
          invoice_type: 'A',
          point_of_sale: 4,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al facturar');
      }

      alert(`Factura generada!\nCAE: ${result.cae}\nNúmero: ${result.invoiceNumber}`);
      
      // Recargar liquidaciones
      const settlementsData = await getClientSettlements(clientId);
      setSettlements(settlementsData as Settlement[]);
    } catch (error) {
      console.error('Error facturando:', error);
      alert(error instanceof Error ? error.message : 'Error al facturar');
    } finally {
      setFacturando(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-4 h-4 animate-spin inline-block mr-2 text-neutral-400" />
        <span className="text-sm text-neutral-500">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-4 mb-4 text-sm">
        <button
          onClick={() => setActiveTab('remitos')}
          className={`pb-1 transition-colors ${
            activeTab === 'remitos'
              ? 'text-neutral-900 border-b-2 border-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Remitos pendientes {shipments.length > 0 && <span className="text-neutral-400">({shipments.length})</span>}
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`pb-1 transition-colors ${
            activeTab === 'historico'
              ? 'text-neutral-900 border-b-2 border-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Histórico {settlements.length > 0 && <span className="text-neutral-400">({settlements.length})</span>}
        </button>
      </div>

      {/* Tab: Remitos */}
      {activeTab === 'remitos' && (
        <div>
          {shipments.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-400">
              No hay remitos pendientes
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <button onClick={toggleAll} className="text-xs text-neutral-600 hover:text-neutral-900">
                  {selectedShipments.size === shipments.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-neutral-500">{selectedShipments.size} seleccionados</span>
                  <span className="font-medium font-mono">${formatCurrency(selectedTotal)}</span>
                </div>
              </div>

              <div className="border border-neutral-200 rounded overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remitente</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((shipment) => (
                      <tr
                        key={shipment.id}
                        onClick={() => toggleShipment(shipment.id)}
                        className={`border-b border-neutral-100 last:border-0 cursor-pointer transition-colors ${
                          selectedShipments.has(shipment.id) ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            selectedShipments.has(shipment.id) ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300'
                          }`}>
                            {selectedShipments.has(shipment.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-neutral-900">
                          {shipment.delivery_note_number || `#${shipment.id}`}
                        </td>
                        <td className="px-3 py-2 text-neutral-500 text-xs">
                          {formatDate(shipment.created_at)}
                        </td>
                        <td className="px-3 py-2 text-neutral-600 truncate max-w-[150px]">
                          {shipment.sender_name}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          ${formatCurrency(shipment.calculated_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateSettlement}
                  disabled={selectedShipments.size === 0 || generating}
                  className="h-9 px-4 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-sm rounded flex items-center gap-2 transition-colors"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Generando...</>
                  ) : (
                    <>Liquidar seleccionados<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Histórico */}
      {activeTab === 'historico' && (
        <div>
          {settlements.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-400">
              No hay liquidaciones anteriores
            </div>
          ) : (
            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Nro.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Total</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Factura</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement) => (
                    <tr key={settlement.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-3 py-2 font-mono text-neutral-900">#{settlement.settlement_number}</td>
                      <td className="px-3 py-2 text-neutral-500 text-xs">{formatDate(settlement.settlement_date)}</td>
                      <td className="px-3 py-2 text-right font-mono">${formatCurrency(settlement.total_amount)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          settlement.status === 'pagada' || settlement.status === 'conformada' 
                            ? 'bg-neutral-100 text-neutral-700' 
                            : settlement.status === 'facturada' 
                            ? 'bg-neutral-100 text-neutral-600'
                            : settlement.status === 'disputada'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          {SETTLEMENT_STATUS_LABELS[settlement.status] || settlement.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {settlement.cae ? (
                          <span className="text-xs font-mono text-neutral-600">{settlement.invoice_number}</span>
                        ) : (
                          <span className="text-xs text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/liquidaciones/${settlement.id}`}
                            className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline"
                          >
                            Ver
                          </Link>
                          {!settlement.cae && settlement.status === 'generada' && (
                            <button
                              onClick={() => handleFacturar(settlement.id)}
                              disabled={facturando === settlement.id}
                              className="text-xs px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded flex items-center gap-1"
                            >
                              {facturando === settlement.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <><Zap className="w-3 h-3" />AFIP</>
                              )}
                            </button>
                          )}
                          {settlement.invoice_pdf_url && (
                            <a
                              href={settlement.invoice_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

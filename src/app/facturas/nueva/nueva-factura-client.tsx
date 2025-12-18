"use client";

import { useState, useEffect } from "react";
import { Loader2, FileText, Send, CheckCircle2, AlertCircle, Building2, Hash } from "lucide-react";
import { useRouter } from "next/navigation";

interface Cliente {
  id: number;
  legal_name: string;
  tax_id: string | null;
}

interface Remito {
  id: number;
  delivery_note_number: string;
  created_at: string;
  weight_kg: number | null;
  volume_m3: number | null;
  declared_value: number | null;
  recipient_name?: string;
  quotation?: {
    total_price: number;
  };
}

type InvoiceType = 'A' | 'A_MONO' | 'B' | 'B_EXENTO';
type EmissionMode = 'manual' | 'automatic';

const PUNTOS_VENTA = [
  { value: 5, label: '0005 - San Salvador de Jujuy' },
  { value: 4, label: '0004 - Buenos Aires' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR');
}

interface NuevaFacturaClientProps {
  initialClientes: Cliente[];
}

export function NuevaFacturaClient({ initialClientes }: NuevaFacturaClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<EmissionMode>('automatic');
  const [loading, setLoading] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    cae?: string;
    caeExpiration?: string;
    invoiceNumber?: string;
    error?: string;
  } | null>(null);

  // Modo automático - usar clientes del servidor
  const [clientes] = useState<Cliente[]>(initialClientes);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [remitos, setRemitos] = useState<Remito[]>([]);
  const [selectedRemitos, setSelectedRemitos] = useState<number[]>([]);
  const [loadingRemitos, setLoadingRemitos] = useState(false);

  // Modo manual
  const [manualClienteId, setManualClienteId] = useState<number | null>(null);
  const [manualCuit, setManualCuit] = useState('');
  const [manualNombre, setManualNombre] = useState('');
  const [manualNeto, setManualNeto] = useState('');
  const [manualConcepto, setManualConcepto] = useState('Servicios de flete');

  // Común
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('A');
  const [pointOfSale, setPointOfSale] = useState(5);
  const [sendEmail, setSendEmail] = useState(true);

  // Cargar remitos no facturados del cliente via API
  useEffect(() => {
    async function loadRemitos() {
      if (!selectedClienteId) {
        setRemitos([]);
        return;
      }

      setLoadingRemitos(true);
      try {
        const response = await fetch(`/api/remitos-pendientes?cliente_id=${selectedClienteId}`);
        const data = await response.json();
        
        if (data.remitos) {
          setRemitos(data.remitos);
          setSelectedRemitos(data.remitos.map((r: Remito) => r.id)); // Seleccionar todos por default
        }
      } catch (error) {
        console.error('Error loading remitos:', error);
        setRemitos([]);
      }
      setLoadingRemitos(false);
    }
    loadRemitos();
  }, [selectedClienteId]);

  const selectedCliente = clientes.find(c => c.id === selectedClienteId);
  
  const totalRemitosSeleccionados = remitos
    .filter(r => selectedRemitos.includes(r.id))
    .reduce((sum, r) => sum + (r.quotation?.total_price || 0), 0);

  const netoAutomatico = totalRemitosSeleccionados / 1.21;
  const ivaAutomatico = totalRemitosSeleccionados - netoAutomatico;

  const netoManual = parseFloat(manualNeto) || 0;
  const ivaManual = netoManual * 0.21;
  const totalManual = netoManual + ivaManual;

  const handleToggleRemito = (id: number) => {
    setSelectedRemitos(prev => 
      prev.includes(id) 
        ? prev.filter(r => r !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRemitos.length === remitos.length) {
      setSelectedRemitos([]);
    } else {
      setSelectedRemitos(remitos.map(r => r.id));
    }
  };

  // Convertir tipo de factura interno a tipo AFIP
  // A_MONO = Monotributista recibe Factura A con leyenda especial (ley 2021)
  // B_EXENTO = Exento recibe Factura B
  const getAfipInvoiceType = (type: InvoiceType): 'A' | 'B' => {
    if (type === 'A' || type === 'A_MONO') return 'A';
    return 'B';
  };

  const handleEmitir = async () => {
    setEmitting(true);
    setResult(null);

    try {
      let requestBody: any;
      const afipInvoiceType = getAfipInvoiceType(invoiceType);
      
      if (mode === 'automatic') {
        if (!selectedCliente?.tax_id) {
          throw new Error('Cliente sin CUIT');
        }
        if (selectedRemitos.length === 0) {
          throw new Error('Seleccione al menos un remito');
        }

        requestBody = {
          cliente_id: selectedCliente.id,
          cliente_cuit: selectedCliente.tax_id,
          cliente_nombre: selectedCliente.legal_name,
          invoice_type: afipInvoiceType,
          invoice_type_detail: invoiceType, // Para registro interno
          point_of_sale: pointOfSale,
          concepto: `Servicios de flete - ${selectedRemitos.length} remitos`,
          neto: netoAutomatico,
          iva: ivaAutomatico,
          total: totalRemitosSeleccionados,
          emission_mode: 'automatic',
          remito_ids: selectedRemitos,
          send_email: sendEmail,
        };
      } else {
        if (!manualCuit) {
          throw new Error('Ingrese el CUIT del cliente');
        }
        if (netoManual <= 0) {
          throw new Error('Ingrese un importe válido');
        }

        requestBody = {
          cliente_id: manualClienteId || undefined,
          cliente_cuit: manualCuit,
          cliente_nombre: manualNombre || 'Cliente',
          invoice_type: afipInvoiceType,
          invoice_type_detail: invoiceType, // Para registro interno
          point_of_sale: pointOfSale,
          concepto: manualConcepto,
          neto: netoManual,
          iva: ivaManual,
          total: totalManual,
          emission_mode: 'manual',
          send_email: sendEmail,
        };
      }

      const response = await fetch('/api/afip/factura-nueva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          cae: data.cae,
          caeExpiration: data.caeExpiration,
          invoiceNumber: data.invoiceNumber,
        });
      } else {
        throw new Error(data.error || 'Error al emitir factura');
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setEmitting(false);
    }
  };

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto">
      <div className="border-b border-neutral-200 pb-3 mb-6">
        <h1 className="text-lg font-medium text-neutral-900">Nueva Factura</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Emitir factura electrónica a través de AFIP
        </p>
      </div>

      {/* Selector de modo */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('automatic')}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
            mode === 'automatic'
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="font-medium">Modo Automático</div>
          <div className="text-xs text-neutral-500 mt-1">
            Seleccionar cliente y remitos pendientes
          </div>
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
            mode === 'manual'
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-neutral-200 hover:border-neutral-300'
          }`}
        >
          <div className="font-medium">Modo Manual</div>
          <div className="text-xs text-neutral-500 mt-1">
            Ingresar CUIT e importe directamente
          </div>
        </button>
      </div>

      {/* Configuración común */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Tipo de Factura
          </label>
          <select
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          >
            <option value="A">Factura A (Resp. Inscripto)</option>
            <option value="A_MONO">Factura A (Monotributista)</option>
            <option value="B">Factura B (Consumidor Final)</option>
            <option value="B_EXENTO">Factura B (Exento)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
            Punto de Venta
          </label>
          <select
            value={pointOfSale}
            onChange={(e) => setPointOfSale(parseInt(e.target.value))}
            className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          >
            {PUNTOS_VENTA.map(pv => (
              <option key={pv.value} value={pv.value}>{pv.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Toggle envío por email */}
      <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
        <div>
          <div className="text-sm font-medium text-neutral-700">Enviar factura por email</div>
          <div className="text-xs text-neutral-500">
            Se enviará al email del cliente con copia a administración
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSendEmail(!sendEmail)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            sendEmail ? 'bg-orange-500' : 'bg-neutral-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              sendEmail ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Modo Automático */}
      {mode === 'automatic' && (
        <div className="space-y-4">
          {/* Selector de cliente */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
              Cliente
            </label>
            <select
              value={selectedClienteId || ''}
              onChange={(e) => setSelectedClienteId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              disabled={loading}
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.legal_name} - {c.tax_id}
                </option>
              ))}
            </select>
          </div>

          {/* Remitos pendientes */}
          {selectedClienteId && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700">
                  Remitos Pendientes de Facturar
                </span>
                {remitos.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {selectedRemitos.length === remitos.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                )}
              </div>

              {loadingRemitos ? (
                <div className="px-4 py-8 text-center text-neutral-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Cargando remitos...
                </div>
              ) : remitos.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-400">
                  No hay remitos pendientes de facturar
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left w-10"></th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {remitos.map(r => (
                        <tr
                          key={r.id}
                          className={`border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 ${
                            selectedRemitos.includes(r.id) ? 'bg-orange-50' : ''
                          }`}
                          onClick={() => handleToggleRemito(r.id)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedRemitos.includes(r.id)}
                              onChange={() => handleToggleRemito(r.id)}
                              className="rounded border-neutral-300"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono">{r.delivery_note_number}</td>
                          <td className="px-3 py-2 text-neutral-600">{formatDate(r.created_at)}</td>
                          <td className="px-3 py-2 text-neutral-600">{r.recipient_name}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatCurrency(r.quotation?.total_price || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totales */}
              {selectedRemitos.length > 0 && (
                <div className="bg-neutral-50 px-4 py-3 border-t border-neutral-200">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-600">Remitos seleccionados:</span>
                    <span className="font-medium">{selectedRemitos.length}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-600">Neto gravado:</span>
                    <span>{formatCurrency(netoAutomatico)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-600">IVA 21%:</span>
                    <span>{formatCurrency(ivaAutomatico)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-neutral-200">
                    <span>Total:</span>
                    <span>{formatCurrency(totalRemitosSeleccionados)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modo Manual */}
      {mode === 'manual' && (
        <div className="space-y-4">
          {/* Selector de cliente */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
              Cliente
            </label>
            <select
              value={manualClienteId || ''}
              onChange={(e) => {
                const id = e.target.value ? parseInt(e.target.value) : null;
                setManualClienteId(id);
                if (id) {
                  const cliente = clientes.find(c => c.id === id);
                  if (cliente) {
                    setManualNombre(cliente.legal_name);
                    setManualCuit(cliente.tax_id || '');
                  }
                } else {
                  setManualNombre('');
                  setManualCuit('');
                }
              }}
              className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              disabled={loading}
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.legal_name} {c.tax_id ? `- ${c.tax_id}` : '(sin CUIT)'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                CUIT del Cliente *
              </label>
              <input
                type="text"
                value={manualCuit}
                onChange={(e) => setManualCuit(e.target.value)}
                placeholder="30-12345678-9"
                className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              />
              {manualClienteId && !clientes.find(c => c.id === manualClienteId)?.tax_id && (
                <p className="text-xs text-amber-600 mt-1">
                  Este cliente no tiene CUIT registrado. Ingreselo manualmente.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
                Razón Social
              </label>
              <input
                type="text"
                value={manualNombre}
                onChange={(e) => setManualNombre(e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
              Concepto
            </label>
            <input
              type="text"
              value={manualConcepto}
              onChange={(e) => setManualConcepto(e.target.value)}
              placeholder="Descripción del servicio"
              className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">
              Importe Neto (sin IVA) *
            </label>
            <input
              type="number"
              value={manualNeto}
              onChange={(e) => setManualNeto(e.target.value)}
              placeholder="0.00"
              className="w-full h-10 px-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
            />
          </div>

          {netoManual > 0 && (
            <div className="bg-neutral-50 px-4 py-3 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-600">Neto gravado:</span>
                <span>{formatCurrency(netoManual)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-600">IVA 21%:</span>
                <span>{formatCurrency(ivaManual)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-neutral-200">
                <span>Total:</span>
                <span>{formatCurrency(totalManual)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className={`mt-6 border rounded-lg p-4 ${
          result.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Factura Emitida Correctamente' : 'Error al Emitir'}
              </h3>
              {result.success ? (
                <div className="mt-2 space-y-1 text-sm text-green-700">
                  <p><strong>Nº Factura:</strong> {result.invoiceNumber}</p>
                  <p><strong>CAE:</strong> {result.cae}</p>
                  <p><strong>Vto CAE:</strong> {result.caeExpiration}</p>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`/api/afip/generate-pdf?invoiceNumber=${encodeURIComponent(result.invoiceNumber || '')}&cae=${encodeURIComponent(result.cae || '')}&caeExpiration=${encodeURIComponent(result.caeExpiration || '')}&clienteCuit=${mode === 'automatic' ? encodeURIComponent(selectedCliente?.tax_id || '') : encodeURIComponent(manualCuit)}&clienteNombre=${mode === 'automatic' ? encodeURIComponent(selectedCliente?.legal_name || '') : encodeURIComponent(manualNombre)}&neto=${mode === 'automatic' ? netoAutomatico : netoManual}&iva=${mode === 'automatic' ? ivaAutomatico : ivaManual}&total=${mode === 'automatic' ? totalRemitosSeleccionados : totalManual}&invoiceType=${invoiceType}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      <FileText className="w-4 h-4" />
                      Descargar PDF
                    </a>
                    <button
                      onClick={() => router.push('/facturas')}
                      className="px-3 py-1.5 border border-green-600 text-green-700 rounded text-sm hover:bg-green-100"
                    >
                      Ver Facturas
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-red-700">{result.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botón emitir */}
      {!result?.success && (
        <button
          onClick={handleEmitir}
          disabled={emitting || (mode === 'automatic' && selectedRemitos.length === 0) || (mode === 'manual' && netoManual <= 0)}
          className="w-full mt-6 h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {emitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Emitiendo factura...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Emitir Factura {getAfipInvoiceType(invoiceType)}
            </>
          )}
        </button>
      )}

      {/* Warning */}
      <p className="text-xs text-center text-neutral-400 mt-4">
        ⚠️ Esta acción emite una factura REAL a través del webservice de AFIP (Producción)
      </p>
    </div>
  );
}


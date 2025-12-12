"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, Send } from "lucide-react";

interface Cliente {
  id: number;
  legal_name: string;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  payment_terms: string | null;
}

interface Liquidacion {
  cliente: Cliente | null;
  periodo: string;
  descripcion: string;
  operaciones: number;
  subtotalFlete: number;
  iva: number;
  total: number;
}

interface FacturaTestClientProps {
  cliente: Cliente | null;
  liquidacion: Liquidacion;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

export function FacturaTestClient({ cliente, liquidacion }: FacturaTestClientProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    cae?: string;
    caeExpiration?: string;
    invoiceNumber?: string;
    error?: string;
    neto?: number;
    iva?: number;
    total?: number;
    clienteCuit?: string;
    clienteNombre?: string;
    pointOfSale?: number;
    invoiceType?: string;
  } | null>(null);
  const [invoiceType, setInvoiceType] = useState<'A' | 'B'>('A');
  const [pointOfSale, setPointOfSale] = useState(4);

  const handleEmitirFactura = async () => {
    if (!cliente?.tax_id) {
      setResult({ success: false, error: 'El cliente no tiene CUIT' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/afip/factura-directa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          cliente_cuit: cliente.tax_id,
          cliente_nombre: cliente.legal_name,
          invoice_type: invoiceType,
          point_of_sale: pointOfSale,
          concepto: liquidacion.descripcion,
          neto: liquidacion.subtotalFlete,
          iva: liquidacion.iva,
          total: liquidacion.total,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          cae: data.cae,
          caeExpiration: data.caeExpiration,
          invoiceNumber: data.invoiceNumber,
          neto: liquidacion.subtotalFlete,
          iva: liquidacion.iva,
          total: liquidacion.total,
          clienteCuit: cliente.tax_id || '',
          clienteNombre: cliente.legal_name,
          pointOfSale: pointOfSale,
          invoiceType: invoiceType,
        });
      } else {
        setResult({
          success: false,
          error: data.error || 'Error desconocido',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexión',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-500" />
          <h1 className="text-lg font-medium text-neutral-900">Test de Facturación AFIP</h1>
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          Prueba del webservice de facturación electrónica
        </p>
      </div>

      {/* Datos del Cliente */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">Cliente</h2>
        <div className="space-y-2">
          <p className="text-lg font-bold">{cliente?.legal_name || 'Sin cliente'}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-400">CUIT:</span>{' '}
              <span className="font-mono">{cliente?.tax_id || '-'}</span>
            </div>
            <div>
              <span className="text-neutral-400">Condición:</span>{' '}
              <span className={cliente?.payment_terms === 'cuenta_corriente' ? 'text-orange-600 font-medium' : ''}>
                {cliente?.payment_terms === 'cuenta_corriente' ? 'Cuenta Corriente' : 'Contado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Datos de la Liquidación */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden mb-6">
        <div className="bg-orange-50 px-4 py-3 border-b border-orange-200">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            Liquidación Periodo {liquidacion.periodo}
          </h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-neutral-600 mb-4 italic">"{liquidacion.descripcion}"</p>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Operaciones rendidas:</span>
              <span className="font-medium">{liquidacion.operaciones} remitos</span>
            </div>
            <div className="flex justify-between py-1 border-t border-neutral-100">
              <span className="text-neutral-500">Subtotal (Neto):</span>
              <span className="font-mono">{formatCurrency(liquidacion.subtotalFlete)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">IVA 21%:</span>
              <span className="font-mono">{formatCurrency(liquidacion.iva)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-neutral-900 bg-neutral-50 -mx-4 px-4">
              <span className="font-bold text-lg">TOTAL:</span>
              <span className="font-bold text-lg font-mono">{formatCurrency(liquidacion.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Opciones de Facturación */}
      <div className="border border-neutral-200 rounded-lg p-4 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
          Configuración de Factura
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Tipo de Factura</label>
            <select 
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as 'A' | 'B')}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            >
              <option value="A">Factura A</option>
              <option value="B">Factura B</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Punto de Venta</label>
            <select 
              value={pointOfSale}
              onChange={(e) => setPointOfSale(parseInt(e.target.value))}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0"
            >
              <option value={4}>0004</option>
              <option value={5}>0005</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div className={`border rounded-lg p-4 mb-6 ${
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
                  <p><span className="font-medium">Nº Factura:</span> {result.invoiceNumber}</p>
                  <p><span className="font-medium">CAE:</span> <span className="font-mono">{result.cae}</span></p>
                  <p><span className="font-medium">Vto CAE:</span> {result.caeExpiration}</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-red-700">{result.error}</p>
              )}
            </div>
          </div>
          
          {/* Botón para ver/imprimir factura */}
          {result.success && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <button
                onClick={() => {
                  const params = new URLSearchParams({
                    invoiceNumber: result.invoiceNumber || '',
                    cae: result.cae || '',
                    caeExpiration: result.caeExpiration || '',
                    clienteCuit: result.clienteCuit || '',
                    clienteNombre: result.clienteNombre || '',
                    neto: String(result.neto || 0),
                    iva: String(result.iva || 0),
                    total: String(result.total || 0),
                    invoiceType: result.invoiceType || 'A',
                  });
                  
                  // Abrir en nueva pestaña para ver/imprimir
                  window.open(`/api/afip/generate-pdf?${params.toString()}`, '_blank');
                }}
                className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Ver / Imprimir Factura
              </button>
              <p className="text-xs text-center text-green-600 mt-2">
                Se abrirá en nueva pestaña. Usá Ctrl+P para imprimir o guardar como PDF.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botón de Emitir - Solo visible si no se emitió exitosamente */}
      {!result?.success && (
        <>
          <button
            onClick={handleEmitirFactura}
            disabled={loading || !cliente?.tax_id}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando con AFIP...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Emitir Factura {invoiceType} por AFIP
              </>
            )}
          </button>

          {/* Warning */}
          <p className="text-xs text-center text-neutral-400 mt-4">
            ⚠️ Esta acción emite una factura REAL a través del webservice de AFIP
          </p>
        </>
      )}
    </div>
  );
}


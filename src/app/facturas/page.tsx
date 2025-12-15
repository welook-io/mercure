import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { FileText } from "lucide-react";
import { DownloadButton } from "./download-button";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export default async function FacturasPage() {
  await requireAuth("/facturas");

  // Obtener facturas
  const { data: facturas, error } = await supabase
    .from('mercure_invoices')
    .select('*')
    .order('issue_date', { ascending: false });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-3 mb-4 gap-2">
            <h1 className="text-lg font-medium text-neutral-900">Facturas</h1>
            <Link 
              href="/facturas/nueva"
              className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Nueva Factura
            </Link>
          </div>
          <div className="border border-neutral-200 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Número</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Neto</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">IVA</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Total</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">CAE</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Modo</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {error ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-red-500">
                        Error al cargar facturas: {error.message}
                      </td>
                    </tr>
                  ) : !facturas || facturas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-neutral-400">
                        No hay facturas emitidas
                      </td>
                    </tr>
                  ) : (
                    facturas.map((factura) => (
                      <tr key={factura.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold bg-blue-100 text-blue-700 rounded">
                            {factura.invoice_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-neutral-900">
                          {factura.invoice_number}
                        </td>
                        <td className="px-3 py-2 text-neutral-700 max-w-[200px] truncate" title={factura.client_name}>
                          {factura.client_name}
                        </td>
                        <td className="px-3 py-2 text-neutral-600">
                          {formatDate(factura.issue_date)}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-600">
                          {formatCurrency(Number(factura.neto))}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-600">
                          {formatCurrency(Number(factura.iva))}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-neutral-900">
                          {formatCurrency(Number(factura.total))}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-neutral-500">
                          {factura.cae}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            factura.emission_mode === 'automatic' 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {factura.emission_mode === 'automatic' ? 'Auto' : 'Manual'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <DownloadButton
                            invoiceNumber={factura.invoice_number}
                            cae={factura.cae}
                            caeExpiration={factura.cae_expiration}
                            clienteCuit={factura.client_cuit || ''}
                            clienteNombre={factura.client_name}
                            neto={Number(factura.neto)}
                            iva={Number(factura.iva)}
                            total={Number(factura.total)}
                            invoiceType={factura.invoice_type}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Resumen */}
          {facturas && facturas.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="text-sm text-neutral-500">
                Total: {facturas.length} factura{facturas.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

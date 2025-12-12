"use client";

import { Printer } from "lucide-react";
import { RemitoDocument } from "@/components/documents/remito";
import { RemitoDocumentV2 } from "@/components/documents/remito-v2";
import { useEffect, useState } from "react";

interface RemitoPreviewProps {
  shipment: {
    id: number;
    delivery_note_number: string;
    status: string;
    created_at: string;
    sender?: {
      legal_name: string;
      tax_id?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
    recipient?: {
      legal_name: string;
      tax_id?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
    recipient_address?: string | null;
    package_quantity: number;
    weight_kg: number;
    volume_m3?: number | null;
    declared_value: number;
    load_description?: string | null;
    paid_by?: string | null;
    payment_terms?: string | null;
    notes?: string | null;
  };
}

export function RemitoPreview({ shipment }: RemitoPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [version, setVersion] = useState<'v1' | 'v2'>('v2');
  const [testCtaCte, setTestCtaCte] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Modificar shipment para test de CTA CTE
  const testShipment = testCtaCte 
    ? { ...shipment, payment_terms: 'cuenta_corriente' }
    : shipment;

  if (!mounted) {
    return (
      <div className="px-4 py-4">
        <div className="bg-white border border-neutral-200 px-4 py-3 rounded-lg shadow-sm mb-4">
          <div className="animate-pulse">
            <div className="h-6 bg-neutral-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-neutral-100 rounded w-64"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="px-4 py-4 print:hidden" suppressHydrationWarning>
        <div className="flex items-center justify-between bg-white border border-neutral-200 px-4 py-3 rounded-lg shadow-sm mb-4">
          <div>
            <h1 className="text-lg font-medium text-neutral-900">Diseño de Remito</h1>
            <p className="text-xs text-neutral-500">Envío #{shipment.id} · {shipment.sender?.legal_name} → {shipment.recipient?.legal_name}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Switch de versión */}
            <div className="flex items-center gap-2 bg-neutral-100 rounded-lg p-1">
              <button
                onClick={() => setVersion('v1')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  version === 'v1' 
                    ? 'bg-white text-neutral-900 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Clásico
              </button>
              <button
                onClick={() => setVersion('v2')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  version === 'v2' 
                    ? 'bg-white text-neutral-900 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Moderno
              </button>
            </div>

            {/* Toggle CTA CTE test */}
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input 
                type="checkbox" 
                checked={testCtaCte}
                onChange={(e) => setTestCtaCte(e.target.checked)}
                className="rounded border-neutral-300"
              />
              <span className="text-neutral-600">Test CTA CTE</span>
            </label>

            {/* Imprimir */}
            <button 
              onClick={handlePrint}
              className="h-8 px-4 text-sm bg-neutral-900 hover:bg-neutral-800 text-white rounded flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Preview Container */}
      <div className="px-4 print:px-0" suppressHydrationWarning>
        <div 
          className="bg-white shadow-lg mx-auto print:shadow-none print:mx-0 border border-neutral-200 print:border-0"
          style={{ 
            width: '210mm', 
            minHeight: '297mm',
          }}
        >
          {version === 'v1' ? (
            <RemitoDocument shipment={testShipment} />
          ) : (
            <RemitoDocumentV2 shipment={testShipment} />
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

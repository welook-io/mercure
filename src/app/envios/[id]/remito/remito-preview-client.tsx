"use client";

import { Printer, ArrowLeft } from "lucide-react";
import { RemitoDuplex } from "@/components/documents/remito-duplex";
import { useState } from "react";
import Link from "next/link";

interface ShipmentData {
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
  quotation?: {
    base_price: number;
    insurance_cost: number;
    pickup_fee: number;
    total_price: number;
    includes_iva: boolean;
  } | null;
}

interface RemitoPreviewClientProps {
  shipment: ShipmentData;
}

export function RemitoPreviewClient({ shipment }: RemitoPreviewClientProps) {
  // Inicializar mounted en true directamente para evitar setState en effect
  const [mounted] = useState(true);

  const handlePrint = () => {
    const originalTitle = document.title;
    const remitoNumber = shipment.delivery_note_number || `R0005-${String(shipment.id).padStart(8, '0')}`;
    document.title = `Remito - ${remitoNumber}`;
    
    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

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

  const remitoNumber = shipment.delivery_note_number || `R0005-${String(shipment.id).padStart(8, '0')}`;

  return (
    <>
      {/* Header */}
      <div className="px-4 py-4 print:hidden" suppressHydrationWarning>
        <div className="bg-white border border-neutral-200 px-4 py-3 rounded-lg shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                href="/recepcion"
                className="p-2 hover:bg-neutral-100 rounded text-neutral-600"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-lg font-medium text-neutral-900">Remito {remitoNumber}</h1>
                <p className="text-xs text-neutral-500">
                  {shipment.sender?.legal_name} → {shipment.recipient?.legal_name} · <span className="text-orange-600">Formato duplex (Original + Duplicado)</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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
      </div>

      {/* Preview Container - Landscape A4 */}
      <div className="px-4 print:px-0 overflow-x-auto" suppressHydrationWarning>
        <div 
          className="bg-white shadow-lg mx-auto print:shadow-none print:mx-0 print:w-full border border-neutral-200 print:border-0"
          style={{ 
            width: '297mm', 
            minWidth: '297mm',
            height: '210mm',
            minHeight: '210mm',
          }}
        >
          <RemitoDuplex shipment={shipment} />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
          }
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

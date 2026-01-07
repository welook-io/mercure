"use client";

import { Printer, FileText, Truck, Receipt } from "lucide-react";
import { RemitoDocument } from "@/components/documents/remito";
import { RemitoDocumentV2 } from "@/components/documents/remito-v2";
import { GuiaDocument } from "@/components/documents/guia";
import { ReciboDocument } from "@/components/documents/recibo";
import { useState } from "react";

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
    quotation?: {
      base_price: number;
      insurance_cost: number;
      pickup_fee: number;
      total_price: number;
      includes_iva: boolean;
    } | null;
  };
}

// Mock de datos de Guía para preview
const mockGuia = {
  id: 1,
  guia_number: "G0001-00000001",
  trip_date: new Date().toISOString(),
  origin: "Buenos Aires, CABA",
  destination: "San Salvador de Jujuy",
  vehicle: {
    plate: "AC 123 XY",
    description: "Mercedes Sprinter 2022",
  },
  driver: {
    name: "Juan Carlos Pérez",
    dni: "25.432.876",
    phone: "388-4123456",
  },
  remitos: [
    {
      id: 1,
      delivery_note_number: "R0005-00012470",
      sender_name: "GRUPO EURO S.A.",
      recipient_name: "HIPERPLACA S.R.L.",
      recipient_address: "ALTE BROWN Nº32, S.S. de Jujuy",
      package_quantity: 3,
      weight_kg: 114.01,
      declared_value: 2015953.4,
      paid_by: "destino",
    },
    {
      id: 2,
      delivery_note_number: "R0005-00012471",
      sender_name: "METALURGICA DEL NORTE S.R.L.",
      recipient_name: "FERRETERÍA CENTRAL",
      recipient_address: "Av. Santibañez 456, Palpalá",
      package_quantity: 5,
      weight_kg: 87.50,
      declared_value: 450000,
      paid_by: "origen",
    },
    {
      id: 3,
      delivery_note_number: "R0005-00012472",
      sender_name: "DISTRIBUIDORA NORTE",
      recipient_name: "COMERCIO SAN PEDRO",
      recipient_address: "Calle Belgrano 789, San Pedro",
      package_quantity: 2,
      weight_kg: 25.30,
      declared_value: 180500,
      paid_by: "destino",
    },
    {
      id: 4,
      delivery_note_number: "R0005-00012473",
      sender_name: "TEXTIL BUENOS AIRES",
      recipient_name: "TIENDA FASHION JUJUY",
      recipient_address: "Av. 19 de Abril 234, S.S. de Jujuy",
      package_quantity: 8,
      weight_kg: 45.00,
      declared_value: 890000,
      paid_by: "destino",
    },
  ],
  notes: "Entregar antes de las 14:00hs. Llamar al llegar.",
};

// Mock de recibo para preview
const mockRecibo = {
  receiptNumber: "R-00001622",
  receiptDate: "2025-11-05",
  clientName: "STENFAR S.A. INDUSTRIAL COMERCIAL IMP. Y EXP.",
  clientCuit: "30516336885",
  clientDomicilio: "Jujuy",
  clientCbu: "",
  currency: "ARS" as const,
  exchangeRate: 1.00,
  paymentItems: [
    { cuenta: "Banco Galicia Cta Cte", descripcion: "Transferencia CBU", importe: 7799230.10 },
    { cuenta: "Retención IIBB Sufrida Buenos Aires", descripcion: "Retención 05/11/2025 Nro. 46494", importe: 85595.45 },
    { cuenta: "Retención Ganancias Sufrida", descripcion: "Retención 05/11/2025 Nro. 18543", importe: 16292.74 },
    { cuenta: "Retenciones SUSS Sufridas", descripcion: "Retención 05/11/2025 Nro. 15490", importe: 65842.65 },
  ],
  cancelledInvoices: [
    { date: "2025-10-07", invoiceNumber: "A-0005-00002314", amount: 7966960.94 },
  ],
  observations: "",
  total: 7966960.94,
};

export function RemitoPreview({ shipment }: RemitoPreviewProps) {
  // Inicializar mounted en true directamente para evitar setState en effect
  const [mounted] = useState(true);
  const [version, setVersion] = useState<'v1' | 'v2'>('v2');
  const [testCtaCte, setTestCtaCte] = useState(false);
  const [docType, setDocType] = useState<'remito' | 'guia' | 'recibo'>('remito');

  const handlePrint = () => {
    // Cambiar título para que el PDF se descargue con el nombre correcto
    const originalTitle = document.title;
    if (docType === 'guia') {
      document.title = `Hoja de Ruta - ${mockGuia.guia_number}`;
    } else if (docType === 'recibo') {
      document.title = `Recibo - ${mockRecibo.receiptNumber}`;
    } else {
      const remitoNumber = `R0005-${String(shipment.id).padStart(8, '0')}`;
      document.title = `Remito - ${remitoNumber}`;
    }
    
    window.print();
    
    // Restaurar título original después de imprimir
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
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
      {/* Header - responsive */}
      <div className="px-4 py-4 print:hidden" suppressHydrationWarning>
        <div className="bg-white border border-neutral-200 px-4 py-3 rounded-lg shadow-sm mb-4">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <h1 className="text-lg font-medium text-neutral-900">Diseño de Documentos</h1>
              <p className="text-xs text-neutral-500 hidden sm:block">Preview de documentos operativos</p>
            </div>
            
            {/* Imprimir */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrint}
                className="h-8 px-3 sm:px-4 text-sm bg-neutral-900 hover:bg-neutral-800 text-white rounded flex items-center gap-2 shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
              <span className="text-[10px] text-neutral-400 hidden md:block max-w-[140px] leading-tight">
                Desactivar encabezados en opciones de impresión
              </span>
            </div>
          </div>

          {/* Selector de tipo de documento - responsive con wrap */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center bg-neutral-100 rounded-lg p-1">
              <button
                onClick={() => setDocType('remito')}
                className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  docType === 'remito' 
                    ? 'bg-white text-neutral-900 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Remito
              </button>
              <button
                onClick={() => setDocType('guia')}
                className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  docType === 'guia' 
                    ? 'bg-white text-neutral-900 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                Hoja de Ruta
              </button>
              <button
                onClick={() => setDocType('recibo')}
                className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  docType === 'recibo' 
                    ? 'bg-white text-neutral-900 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Recibo
              </button>
            </div>

            {/* Opciones de Remito */}
            {docType === 'remito' && (
              <>
                <div className="hidden sm:block h-6 w-px bg-neutral-200"></div>
                <div className="flex items-center bg-neutral-100 rounded-lg p-1">
                  <button
                    onClick={() => setVersion('v1')}
                    className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      version === 'v1' 
                        ? 'bg-white text-neutral-900 shadow-sm' 
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    Clásico
                  </button>
                  <button
                    onClick={() => setVersion('v2')}
                    className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      version === 'v2' 
                        ? 'bg-white text-neutral-900 shadow-sm' 
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    Moderno
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={testCtaCte}
                    onChange={(e) => setTestCtaCte(e.target.checked)}
                    className="rounded border-neutral-300"
                  />
                  <span className="text-neutral-600">CTA CTE</span>
                </label>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Preview Container - scrolleable en mobile */}
      <div className="px-4 print:px-0 overflow-x-auto" suppressHydrationWarning>
        <div 
          className="bg-white shadow-lg mx-auto print:shadow-none print:mx-0 print:w-full border border-neutral-200 print:border-0"
          style={{ 
            width: '210mm', 
            minWidth: '210mm',
            minHeight: '297mm',
          }}
        >
          {docType === 'remito' ? (
            version === 'v1' ? (
              <RemitoDocument shipment={testShipment} />
            ) : (
              <RemitoDocumentV2 shipment={testShipment} />
            )
          ) : docType === 'guia' ? (
            <GuiaDocument guia={mockGuia} />
          ) : (
            <ReciboDocument receipt={mockRecibo} />
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
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

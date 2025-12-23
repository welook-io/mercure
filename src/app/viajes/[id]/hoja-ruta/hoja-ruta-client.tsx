"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { GuiaDocument } from "@/components/documents/guia";
import { Printer, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

interface RemitoResumen {
  id: number;
  delivery_note_number: string;
  sender_name: string;
  recipient_name: string;
  recipient_address: string;
  package_quantity: number;
  weight_kg: number;
  declared_value: number;
  paid_by?: string;
}

interface HojaRutaData {
  id: number;
  guia_number: string;
  trip_date: string;
  origin: string;
  destination: string;
  vehicle?: {
    plate: string;
    description?: string;
  } | null;
  driver?: {
    name: string;
    dni?: string;
    phone?: string;
  } | null;
  remitos: RemitoResumen[];
  notes?: string | null;
}

export function HojaRutaClient({ hojaRuta, tripId }: { hojaRuta: HojaRutaData; tripId: number }) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Hoja_Ruta_${hojaRuta.guia_number}`,
  });

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href={`/viajes/${tripId}`}
            className="h-8 w-8 flex items-center justify-center hover:bg-neutral-100 rounded text-neutral-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-medium text-neutral-900">
              Hoja de Ruta - {hojaRuta.guia_number}
            </h1>
            <p className="text-xs text-neutral-500">
              {hojaRuta.origin} → {hojaRuta.destination} · {hojaRuta.remitos.length} guías
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePrint()}
            className="h-8 px-4 text-sm bg-neutral-900 hover:bg-neutral-800 text-white rounded flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="p-6 flex justify-center">
        <div 
          ref={componentRef}
          className="bg-white shadow-lg rounded-lg overflow-hidden"
          style={{ 
            width: '210mm', 
            minHeight: '297mm',
          }}
        >
          <GuiaDocument guia={hojaRuta} />
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}


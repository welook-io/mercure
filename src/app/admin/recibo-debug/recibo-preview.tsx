"use client";

import { Printer, Send, Loader2 } from "lucide-react";
import { ReciboDocument } from "@/components/documents/recibo";
import { useEffect, useState } from "react";

interface ReceiptPaymentItem {
  cuenta: string;
  descripcion: string;
  importe: number;
}

interface ReceiptCancelledInvoice {
  date: string;
  invoiceNumber: string;
  amount: number;
}

interface ReciboPreviewProps {
  receipt: {
    receiptNumber: string;
    receiptDate: string;
    clientName: string;
    clientCuit: string;
    clientDomicilio?: string;
    clientCbu?: string;
    currency: 'ARS' | 'USD';
    exchangeRate: number;
    paymentItems: ReceiptPaymentItem[];
    cancelledInvoices: ReceiptCancelledInvoice[];
    observations?: string;
    total: number;
  };
}

export function ReciboPreview({ receipt }: ReciboPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Recibo - ${receipt.receiptNumber}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const handleSendTestEmail = async () => {
    setSending(true);
    setSendResult(null);
    
    try {
      const response = await fetch('/api/receipts/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'angelo@kalia.app',
          receipt,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSendResult({ success: true, message: 'Email enviado correctamente' });
      } else {
        setSendResult({ success: false, message: data.error || 'Error al enviar' });
      }
    } catch (error) {
      setSendResult({ success: false, message: 'Error de conexión' });
    } finally {
      setSending(false);
    }
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

  return (
    <>
      {/* Header */}
      <div className="px-4 py-4 print:hidden" suppressHydrationWarning>
        <div className="bg-white border border-neutral-200 px-4 py-3 rounded-lg shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <h1 className="text-lg font-medium text-neutral-900">Diseño de Recibo</h1>
              <p className="text-xs text-neutral-500">Preview del comprobante de pago</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSendTestEmail}
                disabled={sending}
                className="h-8 px-3 sm:px-4 text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded flex items-center gap-2 shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Enviar Test</span>
              </button>
              <button 
                onClick={handlePrint}
                className="h-8 px-3 sm:px-4 text-sm bg-neutral-900 hover:bg-neutral-800 text-white rounded flex items-center gap-2 shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            </div>
          </div>

          {sendResult && (
            <div className={`text-sm px-3 py-2 rounded ${
              sendResult.success 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {sendResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Preview Container */}
      <div className="px-4 print:px-0 overflow-x-auto" suppressHydrationWarning>
        <div 
          className="bg-white shadow-lg mx-auto print:shadow-none print:mx-0 print:w-full border border-neutral-200 print:border-0"
          style={{ 
            width: '210mm', 
            minWidth: '210mm',
            minHeight: '297mm',
          }}
        >
          <ReciboDocument receipt={receipt} />
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













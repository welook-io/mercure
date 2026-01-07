"use client";

import { useState } from "react";
import { Printer, Download, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface SettlementActionsProps {
  settlementId: number;
  hasCae: boolean;
}

export function SettlementActions({ settlementId, hasCae }: SettlementActionsProps) {
  const router = useRouter();
  const [facturando, setFacturando] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleFacturar = async () => {
    setFacturando(true);
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
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al facturar');
    } finally {
      setFacturando(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!hasCae && (
        <Button
          onClick={handleFacturar}
          disabled={facturando}
          size="sm"
          className="h-8 bg-green-600 hover:bg-green-700"
        >
          {facturando ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-1" />Facturando...</>
          ) : (
            <><Zap className="w-4 h-4 mr-1" />Facturar AFIP</>
          )}
        </Button>
      )}
      <button 
        onClick={handlePrint}
        className="flex items-center gap-1.5 h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 rounded transition-colors"
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>
    </div>
  );
}













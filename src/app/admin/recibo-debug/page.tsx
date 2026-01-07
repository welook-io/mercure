import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { ReciboPreview } from "./recibo-preview";

// Datos de ejemplo para el recibo (basados en la imagen)
const mockReceipt = {
  receiptNumber: "R-00001622",
  receiptDate: "2025-11-05",
  clientName: "STENFAR S.A. INDUSTRIAL COMERCIAL IMP. Y EXP.",
  clientCuit: "30516336885",
  clientDomicilio: "Jujuy",
  clientCbu: "",
  currency: "ARS" as const,
  exchangeRate: 1.00,
  paymentItems: [
    {
      cuenta: "Banco Galicia Cta Cte",
      descripcion: "Transferencia CBU",
      importe: 7799230.10,
    },
    {
      cuenta: "Retención IIBB Sufrida Buenos Aires",
      descripcion: "Retención 05/11/2025 Nro. 46494",
      importe: 85595.45,
    },
    {
      cuenta: "Retención Ganancias Sufrida",
      descripcion: "Retención 05/11/2025 Nro. 18543",
      importe: 16292.74,
    },
    {
      cuenta: "Retenciones SUSS Sufridas",
      descripcion: "Retención 05/11/2025 Nro. 15490",
      importe: 65842.65,
    },
  ],
  cancelledInvoices: [
    {
      date: "2025-10-07",
      invoiceNumber: "A-0005-00002314",
      amount: 7966960.94,
    },
  ],
  observations: "",
  total: 7966960.94,
};

export default async function ReciboDebugPage() {
  await requireAuth("/admin/recibo-debug");

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white print:min-h-0">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="pt-12 print:pt-0">
        <ReciboPreview receipt={mockReceipt} />
      </main>
    </div>
  );
}












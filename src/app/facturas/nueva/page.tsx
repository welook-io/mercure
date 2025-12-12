import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { NuevaFacturaClient } from "./nueva-factura-client";

export default async function NuevaFacturaPage() {
  await requireAuth("/facturas/nueva");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <NuevaFacturaClient />
      </main>
    </div>
  );
}


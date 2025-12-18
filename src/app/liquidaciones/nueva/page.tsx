import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NuevaLiquidacionPage() {
  await requireAuth("/liquidaciones");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4 border-b border-neutral-200 pb-3 mb-4">
            <Link href="/liquidaciones" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-medium text-neutral-900">Nueva Liquidación</h1>
          </div>

          <div className="max-w-xl">
            <p className="text-neutral-600 mb-4">
              Para crear una nueva liquidación, andá a <strong>Cuentas Corrientes</strong>, 
              seleccioná un cliente, elegí los remitos pendientes y hacé click en <strong>Liquidar</strong>.
            </p>
            <Link 
              href="/cuentas-corrientes"
              className="inline-flex items-center gap-2 h-9 px-4 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded"
            >
              Ir a Cuentas Corrientes
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}



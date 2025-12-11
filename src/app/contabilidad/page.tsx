import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

export default async function ContabilidadPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          <div className="border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Contabilidad</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="border border-neutral-200 rounded p-3">
              <h3 className="text-xs font-medium text-neutral-500 uppercase mb-2">Conciliación Bancaria</h3>
              <p className="text-sm text-neutral-400">Módulo en desarrollo</p>
            </div>
            <div className="border border-neutral-200 rounded p-3">
              <h3 className="text-xs font-medium text-neutral-500 uppercase mb-2">Asientos</h3>
              <p className="text-sm text-neutral-400">Módulo en desarrollo</p>
            </div>
            <div className="border border-neutral-200 rounded p-3">
              <h3 className="text-xs font-medium text-neutral-500 uppercase mb-2">IVA</h3>
              <p className="text-sm text-neutral-400">Módulo en desarrollo</p>
            </div>
          </div>

          <div className="border border-neutral-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Concepto</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Debe</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Haber</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={4} className="px-3 py-8 text-center text-neutral-400">Sin movimientos</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

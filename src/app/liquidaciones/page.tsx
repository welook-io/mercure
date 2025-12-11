import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";

export default async function LiquidacionesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Liquidación de Sueldos</h1>
            <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded">
              Nueva Liquidación
            </Button>
          </div>
          <div className="border border-neutral-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Período</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Empleado</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Bruto</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Deducciones</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Neto</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={6} className="px-3 py-8 text-center text-neutral-400">Módulo en desarrollo</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

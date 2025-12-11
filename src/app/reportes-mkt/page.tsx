import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

export default async function ReportesMktPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          <div className="border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Reportes de Marketing</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-neutral-200 rounded p-4">
              <h3 className="text-sm font-medium text-neutral-900 mb-2">Rendimiento WhatsApp</h3>
              <p className="text-xs text-neutral-400">Módulo en desarrollo</p>
            </div>
            <div className="border border-neutral-200 rounded p-4">
              <h3 className="text-sm font-medium text-neutral-900 mb-2">Rendimiento Campañas</h3>
              <p className="text-xs text-neutral-400">Módulo en desarrollo</p>
            </div>
            <div className="border border-neutral-200 rounded p-4">
              <h3 className="text-sm font-medium text-neutral-900 mb-2">Métricas Redes</h3>
              <p className="text-xs text-neutral-400">Módulo en desarrollo</p>
            </div>
            <div className="border border-neutral-200 rounded p-4">
              <h3 className="text-sm font-medium text-neutral-900 mb-2">Conversiones</h3>
              <p className="text-xs text-neutral-400">Módulo en desarrollo</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

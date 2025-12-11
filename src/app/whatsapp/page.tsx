import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function WhatsAppPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">WhatsApp Automático</h1>
            <Button className="h-8 px-3 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded">
              Nueva Automatización
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="border border-neutral-200 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Aviso de Despacho</h3>
                <Badge variant="success">Activo</Badge>
              </div>
              <p className="text-xs text-neutral-500">Notifica al cliente cuando su envío sale</p>
            </div>
            <div className="border border-neutral-200 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Confirmación Entrega</h3>
                <Badge variant="success">Activo</Badge>
              </div>
              <p className="text-xs text-neutral-500">Confirma la entrega al destinatario</p>
            </div>
            <div className="border border-neutral-200 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Recordatorio Cobro</h3>
                <Badge variant="warning">Pausado</Badge>
              </div>
              <p className="text-xs text-neutral-500">Recuerda facturas vencidas</p>
            </div>
          </div>

          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Mensajes Recientes</h2>
          <div className="border border-neutral-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Destinatario</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Tipo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Mensaje</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Fecha</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={5} className="px-3 py-8 text-center text-neutral-400">Módulo en desarrollo</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

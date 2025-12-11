import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

const processes = [
  { id: "overview", title: "Visión General", content: "Mercure es una empresa de logística y transporte interprovincial. Recibe mercadería, controla en depósito, consolida por destino, despacha con documentación, hace seguimiento y registra entregas. Administra remitos, liquida cuentas corrientes, factura y cobra." },
  { id: "roles", title: "Roles", content: "Auxiliar depósito: control físico. Administrativo/tráfico: sistema, viajes, documentación. Chofer: transporte y firma conforme. Administración: remitos, liquidaciones, facturas. Contabilidad: ARCA, pagos, IVA. Atención: consultas." },
  { id: "recepcion", title: "1. Recepción", content: "Proveedor llega con remito. Auxiliar descarga, cuenta bultos, revisa estado. Compara con remito. Si coincide: sella. Si no: anota diferencia. Ubica en zona recepción. Administrativo registra en sistema → disponible para despacho." },
  { id: "planificacion", title: "2. Planificación", content: "Tráfico define qué se carga (no la rampa). Criterios: destino/ruteo, urgencia, disponibilidad documental, capacidad unidad. Arma viaje tentativo, valida y aprueba." },
  { id: "documentacion", title: "3. Documentación", content: "Guía/Carta de Porte: remitente, destinatario (CUIT), chofer (DNI), patentes, bultos, peso, valor declarado. Hoja de Ruta opcional. Chofer firma salida." },
  { id: "carga", title: "4. Carga", content: "Auxiliar carga según Guía. Orden: primero adelante (último descargar). Protege frágil. Si hay problema: informa antes de cerrar." },
  { id: "transito", title: "5. Tránsito", content: "GPS y comunicación entre depósitos. BA↔Norte: 24-30hs típico." },
  { id: "entrega", title: "6. Entrega", content: "Receptor controla y firma conforme. Si hay diferencias: se aclaran. Chofer deja copia, conserva otra. Registra horarios." },
  { id: "admin", title: "7. Administración", content: "Remitos firmados → Administración marca 'entregado' → habilita liquidación y facturación." },
  { id: "cc", title: "8. Cuenta Corriente", content: "Remitos archivados por cliente. Cierre mes: liquidación PDF. Inicio mes siguiente: factura consolidada + liquidación." },
  { id: "contado", title: "9. Contado", content: "Ideal: cobrar antes de entregar. Realidad: puede ser después. Siempre factura." },
  { id: "cobranza", title: "10. Cobranza", content: "Plazo: 10 días. Día 11+: recordatorios mail/WA, llamados. Efectivo→CAJA. Transferencia→extracto→imputar. Cheque→registrar→marcar cuando acredita." },
  { id: "contab", title: "11. Contabilidad", content: "Facturas ARCA→sistema contable→imputar pagos, retenciones, conciliar. Mensual: IVA, sueldos, bancos, gastos, proveedores." },
  { id: "docs", title: "Documentos", content: "Remito: base operativa, conforme destino. Guía/Carta Porte: Mercure emite, acompaña transporte. Hoja Ruta: interno. Liquidación: resumen CC. Factura: fiscal, 10 días." },
];

const summarySteps = [
  "Recibir carga, controlar, sellar o anotar diferencias",
  "Registrar en sistema → disponible para despacho",
  "Armar viaje por destino/prioridad, validar capacidad",
  "Emitir Guía/Carta de Porte, chofer firma salida",
  "Cargar según orden de descarga",
  "Salir, seguimiento GPS/comunicación",
  "Destino: firma conforme, entregar copia",
  "Marcar entregado, archivar remitos",
  "CC: liquidación fin de mes, factura mes siguiente",
  "Contado: facturar y cobrar",
  "Enviar facturas, día 10+ gestión cobro",
  "ARCA→contable, imputar, conciliar",
  "IVA, sueldos, bancos, proveedores",
];

export default async function ProcesosPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4 max-w-4xl">
          <div className="border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Procesos</h1>
          </div>

          {/* Resumen */}
          <div className="mb-6">
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Resumen Operativo</h2>
            <div className="border border-neutral-200 rounded p-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {summarySteps.map((step, i) => (
                  <span key={i} className="text-neutral-600">
                    <span className="text-orange-500 font-medium">{String.fromCharCode(97 + i)})</span> {step}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Procesos */}
          <div className="space-y-3">
            {processes.map((p) => (
              <div key={p.id} className="border border-neutral-200 rounded">
                <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-100">
                  <h3 className="text-sm font-medium text-neutral-900">{p.title}</h3>
                </div>
                <div className="px-3 py-2">
                  <p className="text-xs text-neutral-600 leading-relaxed">{p.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cierre */}
          <div className="mt-6 bg-zinc-900 text-white rounded p-4">
            <h2 className="text-sm font-medium mb-2">Cierre</h2>
            <p className="text-xs text-zinc-300">
              Ciclo: recibir → validar → planificar → documentar → cargar → transportar → entregar → marcar → liquidar → facturar → cobrar → imputar → conciliar.
              Trazabilidad: remito sellado + conforme destino + consistencia Sisorg/docs/contabilidad.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

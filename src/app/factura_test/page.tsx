import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { FacturaTestClient } from "./factura-test-client";

async function getHiperplacaData() {
  // Obtener datos de HIPERPLACA
  const { data: entity, error } = await supabase
    .schema('mercure').from('entities')
    .select('*')
    .ilike('legal_name', '%HIPERPLACA%')
    .single();

  console.log('HIPERPLACA query result:', { entity, error });

  // Fallback con datos hardcoded si no hay conexión
  if (!entity) {
    return {
      id: 69,
      legal_name: 'HIPERPLACA',
      tax_id: '30-71193140-2',
      address: 'S.S. de Jujuy',
      phone: null,
      payment_terms: 'cuenta_corriente',
    };
  }

  return entity;
}

export default async function FacturaTestPage() {
  await requireAuth("/factura_test");
  
  const hiperplaca = await getHiperplacaData();

  // Datos de la liquidación de noviembre 2025 basados en la imagen del usuario
  const liquidacionData = {
    cliente: hiperplaca,
    periodo: "11-2025",
    descripcion: "Servicios de flete Bs As - Jujuy periodo 11-2025",
    operaciones: 25, // cantidad de remitos
    subtotalFlete: 2978588.54,
    iva: 625503.59,
    total: 3604092.13,
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <FacturaTestClient 
          cliente={hiperplaca}
          liquidacion={liquidacionData}
        />
      </main>
    </div>
  );
}


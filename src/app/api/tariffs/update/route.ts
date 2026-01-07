import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { id, field, value } = await request.json();

    // Validar campo permitido
    const allowedFields = ['price', 'price_per_kg', 'weight_from_kg', 'weight_to_kg'];
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: 'Campo no permitido' }, { status: 400 });
    }

    // Actualizar en la tabla física del schema mercure
    const { error } = await supabase
      .schema('mercure').from('tariffs')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      console.error('Error updating tariff:', error);
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}












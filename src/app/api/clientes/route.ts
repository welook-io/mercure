import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Obtener todos los clientes (para dropdown de búsqueda)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin!
      .schema('mercure')
      .from('entities')
      .select('id, legal_name, tax_id, address, phone, email, delivery_type, client_type, payment_terms')
      .order('legal_name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}










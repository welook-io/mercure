import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    let queryBuilder = supabaseAdmin
      .schema('mercure')
      .from('invoices')
      .select('*')
      .is('voucher_type', null) // Solo facturas, no NC ni ND
      .order('issue_date', { ascending: false });

    // Si hay búsqueda, filtrar
    if (query && query.trim()) {
      queryBuilder = queryBuilder.or(
        `invoice_number.ilike.%${query}%,client_name.ilike.%${query}%,client_cuit.ilike.%${query}%`
      );
    }

    const { data, error } = await queryBuilder.limit(20);

    if (error) {
      console.error('Error searching invoices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ facturas: data || [] });

  } catch (error) {
    console.error('Error in facturas/buscar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}













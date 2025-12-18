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
      .from('entities')
      .select('id, legal_name, tax_id, entity_type')
      .order('legal_name');

    // Si hay búsqueda, filtrar
    if (query && query.trim()) {
      queryBuilder = queryBuilder.or(
        `legal_name.ilike.%${query}%,tax_id.ilike.%${query}%`
      );
    }

    const { data, error } = await queryBuilder.limit(50);

    if (error) {
      console.error('Error searching clients:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients: data || [] });

  } catch (error) {
    console.error('Error in clientes/buscar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}



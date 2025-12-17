import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cuit = searchParams.get('cuit');
    const name = searchParams.get('name');

    if (!cuit && !name) {
      return NextResponse.json(
        { error: 'Se requiere CUIT o nombre para buscar' },
        { status: 400 }
      );
    }

    let entity = null;

    // Buscar primero por CUIT (más preciso)
    if (cuit && cuit.trim() !== '') {
      const cleanCuit = cuit.replace(/[-\s]/g, ''); // Limpiar guiones y espacios
      
      const { data: byCuit } = await supabaseAdmin
        .schema('mercure').from('entities')
        .select('*')
        .or(`tax_id.eq.${cuit.trim()},tax_id.eq.${cleanCuit}`)
        .limit(1)
        .single();
      
      if (byCuit) {
        entity = byCuit;
      }
    }

    // Si no encontró por CUIT, buscar por nombre similar
    if (!entity && name && name.trim() !== '') {
      // Limpiar el nombre: quitar SRL, S.R.L., SA, S.A., etc.
      const cleanName = name.trim()
        .replace(/\s*(S\.?R\.?L\.?|S\.?A\.?|S\.?A\.?S\.?|S\.?C\.?|SRL|SA|SAS)\s*$/i, '')
        .trim();
      
      const searchName = cleanName.toLowerCase();
      
      // Buscar coincidencia exacta primero (con el nombre limpio)
      const { data: exactMatch } = await supabaseAdmin
        .schema('mercure').from('entities')
        .select('*')
        .ilike('legal_name', cleanName)
        .limit(1)
        .single();

      if (exactMatch) {
        entity = exactMatch;
      } else {
        // Buscar coincidencia parcial
        const { data: partialMatches } = await supabaseAdmin
          .schema('mercure').from('entities')
          .select('*')
          .or(`legal_name.ilike.%${searchName}%,legal_name.ilike.${searchName}%`)
          .limit(5);

        if (partialMatches && partialMatches.length > 0) {
          // Si hay un solo match y es muy similar, devolverlo como encontrado
          if (partialMatches.length === 1) {
            entity = partialMatches[0];
          } else {
            // Devolver lista de sugerencias
            return NextResponse.json({ 
              found: false,
              suggestions: partialMatches.map(e => ({
                id: e.id,
                legal_name: e.legal_name,
                tax_id: e.tax_id,
                address: e.address,
                phone: e.phone,
                email: e.email,
              }))
            });
          }
        }
      }
    }

    if (entity) {
      return NextResponse.json({ 
        found: true, 
        entity: {
          id: entity.id,
          legal_name: entity.legal_name,
          tax_id: entity.tax_id,
          address: entity.address,
          phone: entity.phone,
          email: entity.email,
          contact_name: entity.contact_name,
          destination: entity.destination,
          payment_terms: entity.payment_terms,
        }
      });
    }

    return NextResponse.json({ found: false, suggestions: [] });

  } catch (error) {
    console.error('Error searching entity:', error);
    return NextResponse.json(
      { error: 'Error al buscar entidad' },
      { status: 500 }
    );
  }
}



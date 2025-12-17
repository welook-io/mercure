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

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json();

    if (!tripId) {
      return NextResponse.json(
        { error: 'Debe especificar un viaje' },
        { status: 400 }
      );
    }

    // Verificar que el viaje existe
    const { data: trip, error: tripError } = await supabaseAdmin
      .schema('mercure').from('trips')
      .select('id, status')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { error: 'Viaje no encontrado' },
        { status: 404 }
      );
    }

    if (!['planned', 'loading'].includes(trip.status)) {
      return NextResponse.json(
        { error: 'El viaje ya fue despachado' },
        { status: 400 }
      );
    }

    // Verificar que tiene envíos asignados
    const { data: shipments } = await supabaseAdmin
      .schema('mercure').from('shipments')
      .select('id')
      .eq('trip_id', tripId);

    if (!shipments || shipments.length === 0) {
      return NextResponse.json(
        { error: 'El viaje no tiene envíos asignados' },
        { status: 400 }
      );
    }

    // Actualizar viaje a en_transito
    const { error: updateTripError } = await supabaseAdmin
      .schema('mercure').from('trips')
      .update({
        status: 'in_transit',
        departure_time: new Date().toISOString()
      })
      .eq('id', tripId);

    if (updateTripError) {
      return NextResponse.json(
        { error: 'Error al despachar viaje' },
        { status: 500 }
      );
    }

    // Actualizar todos los envíos a en_transito
    const { error: updateShipmentsError } = await supabaseAdmin
      .schema('mercure').from('shipments')
      .update({ status: 'en_transito' })
      .eq('trip_id', tripId);

    if (updateShipmentsError) {
      console.error('Error updating shipments:', updateShipmentsError);
    }

    // Registrar evento
    await supabaseAdmin
      .schema('mercure').from('events')
      .insert({
        event_type: 'trip_dispatched',
        trip_id: tripId,
        metadata: {
          dispatched_at: new Date().toISOString(),
          shipments_count: shipments.length
        }
      });

    return NextResponse.json({
      success: true,
      tripId,
      shipmentsDispatched: shipments.length
    });

  } catch (error) {
    console.error('Error dispatching trip:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}



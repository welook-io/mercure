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
    const { tripId, directToDestination } = await request.json();

    if (!tripId) {
      return NextResponse.json(
        { error: 'Debe especificar un viaje' },
        { status: 400 }
      );
    }

    // Verificar que el viaje existe y obtener tipo
    const { data: trip, error: tripError } = await supabaseAdmin
      .schema('mercure').from('trips')
      .select('id, status, trip_type')
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

    const isUltimaMilla = trip.trip_type === 'ultima_milla';

    // Verificar que tiene envíos asignados
    let shipments;
    if (isUltimaMilla) {
      // Para última milla, buscar por last_mile_trip_id
      const { data } = await supabaseAdmin
        .schema('mercure').from('shipments')
        .select('id')
        .eq('last_mile_trip_id', tripId);
      shipments = data;
    } else {
      const { data } = await supabaseAdmin
        .schema('mercure').from('shipments')
        .select('id')
        .eq('trip_id', tripId);
      shipments = data;
    }

    if (!shipments || shipments.length === 0) {
      return NextResponse.json(
        { error: 'El viaje no tiene guías asignadas' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let newTripStatus: string;
    let newShipmentStatus: string;
    let eventType: string;

    if (isUltimaMilla) {
      // Última milla: viaje completed, envíos entregados
      newTripStatus = 'completed';
      newShipmentStatus = 'delivered';
      eventType = 'last_mile_delivered';
    } else if (directToDestination) {
      // Viaje directo a destino: arrived, envíos en_destino
      newTripStatus = 'arrived';
      newShipmentStatus = 'en_destino';
      eventType = 'trip_arrived';
    } else {
      // Viaje normal en tránsito
      newTripStatus = 'in_transit';
      newShipmentStatus = 'en_transito';
      eventType = 'trip_dispatched';
    }

    // Actualizar viaje
    const tripUpdate: Record<string, unknown> = {
      status: newTripStatus,
      departure_time: now,
    };
    
    // Si va directo a destino o es última milla, también setear arrival_time
    if (directToDestination || isUltimaMilla) {
      tripUpdate.arrival_time = now;
    }

    const { error: updateTripError } = await supabaseAdmin
      .schema('mercure').from('trips')
      .update(tripUpdate)
      .eq('id', tripId);

    if (updateTripError) {
      return NextResponse.json(
        { error: 'Error al despachar viaje' },
        { status: 500 }
      );
    }

    // Actualizar todos los envíos
    if (isUltimaMilla) {
      const { error: updateShipmentsError } = await supabaseAdmin
        .schema('mercure').from('shipments')
        .update({ status: newShipmentStatus })
        .eq('last_mile_trip_id', tripId);

      if (updateShipmentsError) {
        console.error('Error updating shipments:', updateShipmentsError);
      }
    } else {
      const { error: updateShipmentsError } = await supabaseAdmin
        .schema('mercure').from('shipments')
        .update({ status: newShipmentStatus })
        .eq('trip_id', tripId);

      if (updateShipmentsError) {
        console.error('Error updating shipments:', updateShipmentsError);
      }
    }

    // Registrar evento
    await supabaseAdmin
      .schema('mercure').from('events')
      .insert({
        event_type: eventType,
        trip_id: tripId,
        metadata: {
          dispatched_at: now,
          shipments_count: shipments.length,
          direct_to_destination: directToDestination || false,
          is_ultima_milla: isUltimaMilla
        }
      });

    return NextResponse.json({
      success: true,
      tripId,
      shipmentsDispatched: shipments.length,
      newStatus: newTripStatus
    });

  } catch (error) {
    console.error('Error dispatching trip:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}






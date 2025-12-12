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
    const { shipmentIds, tripId } = await request.json();

    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un envío' },
        { status: 400 }
      );
    }

    if (!tripId) {
      return NextResponse.json(
        { error: 'Debe seleccionar un viaje' },
        { status: 400 }
      );
    }

    // Verificar que el viaje existe y está en estado válido
    const { data: trip, error: tripError } = await supabaseAdmin
      .from('mercure_trips')
      .select('id, status, destination')
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
        { error: 'El viaje ya fue despachado o completado' },
        { status: 400 }
      );
    }

    // Actualizar los envíos: asignar al viaje y cambiar estado
    const { data: updatedShipments, error: updateError } = await supabaseAdmin
      .from('mercure_shipments')
      .update({
        trip_id: tripId,
        status: 'consolidada'
      })
      .in('id', shipmentIds)
      .select('id');

    if (updateError) {
      console.error('Error updating shipments:', updateError);
      return NextResponse.json(
        { error: 'Error al consolidar envíos' },
        { status: 500 }
      );
    }

    // Actualizar el viaje a estado "loading" si estaba en "planned"
    if (trip.status === 'planned') {
      await supabaseAdmin
        .from('mercure_trips')
        .update({ status: 'loading' })
        .eq('id', tripId);
    }

    // Registrar evento
    await supabaseAdmin
      .from('mercure_events')
      .insert(
        shipmentIds.map((id: number) => ({
          event_type: 'shipment_consolidated',
          shipment_id: id,
          trip_id: tripId,
          metadata: {
            consolidated_at: new Date().toISOString(),
          }
        }))
      );

    return NextResponse.json({
      success: true,
      consolidated: updatedShipments?.length || 0,
      tripId
    });

  } catch (error) {
    console.error('Error consolidating:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { checkServiceStatus, getPointsOfSale } from '@/lib/afip/wsfe';
// Updated: force recompile
import { hasValidCredentials, getAfipConfig } from '@/lib/afip/wsaa';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Consultar puntos de venta
  if (action === 'puntos-venta') {
    try {
      const result = await getPointsOfSale();
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error' 
      }, { status: 500 });
    }
  }

  // Status general
  try {
    const wsfeStatus = await checkServiceStatus();
    const hasCredentials = hasValidCredentials();

    let config;
    try {
      const afipConfig = await getAfipConfig();
      config = {
        hasCert: true,
        hasKey: true,
        cuit: afipConfig.cuit,
        environment: afipConfig.environment,
      };
    } catch {
      config = {
        hasCert: false,
        hasKey: false,
        cuit: null,
        environment: 'unknown',
      };
    }

    const allConfigured = config.hasCert && config.hasKey;
    const wsfeOk = wsfeStatus.appServer && wsfeStatus.dbServer && wsfeStatus.authServer;

    return NextResponse.json({
      status: allConfigured && wsfeOk ? 'ok' : 'error',
      config,
      credentials: { cached: hasCredentials },
      wsfe: wsfeStatus,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}


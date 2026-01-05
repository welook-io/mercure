import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Tarifas base por peso (10kg - 1000kg) según tarifarios 2026
// Estructura: [peso_hasta_kg, Capital->Jujuy, Capital->Salta, Rosario->Jujuy, Rosario->Salta]
const TARIFAS_BASE_DEPOSITO: [number, number, number, number, number][] = [
  // Kg,     CF->JUJ,    CF->SALTA,  ROS->JUJ,   ROS->SALTA
  [10,      18788.41,   25005.67,   26672.71,   32007.25],
  [20,      20780.38,   27656.79,   29500.58,   35400.69],
  [30,      25019.04,   33298.07,   35517.94,   42621.53],
  [40,      29225.80,   38896.89,   41490.02,   49788.02],
  [50,      33368.00,   44409.78,   47370.43,   56844.52],
  [60,      37565.59,   49996.38,   53329.47,   63995.37],
  [70,      41825.02,   55665.30,   59376.32,   71251.58],
  [80,      46063.39,   61306.18,   65393.26,   78471.91],
  [90,      50256.90,   66887.37,   71346.53,   85615.83],
  [100,     54484.74,   72514.23,   77348.51,   92818.21],
  [110,     58707.30,   78134.08,   83343.02,   100011.62],
  [120,     62887.72,   83697.84,   89277.70,   107133.24],
  [130,     67136.62,   89352.74,   95309.59,   114371.51],
  [140,     71361.90,   94976.20,   101307.94,  121569.53],
  [150,     75539.61,   100536.36,  107238.78,  128686.54],
  [160,     79788.51,   106191.26,  113270.67,  135924.81],
  [170,     84042.68,   111853.17,  119310.05,  143172.05],
  [180,     88233.64,   117430.95,  125259.68,  150311.62],
  [190,     92440.40,   123029.77,  131231.76,  157478.11],
  [200,     93123.43,   123938.82,  132201.41,  158641.69],  // Salto importante
  [210,     97177.00,   129333.75,  137956.00,  165547.20],
  [220,     101210.13,  134701.48,  143681.58,  172417.89],
  [230,     105283.98,  140123.41,  149464.97,  179357.96],
  [240,     109347.55,  145531.64,  155233.75,  186280.50],
  [250,     113436.61,  150973.82,  161038.74,  193246.49],
  [260,     117406.27,  156257.07,  166674.21,  200009.05],
  [270,     121518.09,  161729.53,  172511.50,  207013.80],
  [280,     125584.27,  167141.24,  178283.99,  213940.79],
  [290,     129693.62,  172610.42,  184117.78,  220941.34],
  [300,     133769.94,  178035.63,  189904.67,  227885.61],
  [310,     135698.15,  180601.90,  192642.03,  231170.43],
  [320,     136381.10,  181510.85,  193611.57,  232333.89],
  [330,     140286.01,  186707.92,  199155.12,  238986.14],
  [340,     144249.44,  191982.89,  204781.74,  245738.09],
  [350,     148591.89,  197762.29,  210946.45,  253135.74],
  [360,     152049.49,  202364.05,  215854.98,  259025.98],
  [370,     156000.80,  207622.88,  221464.40,  265757.28],
  [380,     159873.93,  212777.67,  226962.84,  272355.41],
  [390,     163739.82,  217922.81,  232451.00,  278941.20],
  [400,     167671.61,  223155.67,  238032.72,  285639.26],
  [410,     171600.90,  228385.20,  243610.88,  292333.06],
  [420,     175471.53,  233536.65,  249105.76,  298926.91],
  [430,     179398.45,  238763.03,  254680.56,  305616.67],
  [440,     183303.35,  243960.10,  260224.11,  312268.93],
  [450,     187200.87,  249147.34,  265757.16,  318908.60],
  [460,     191135.18,  254383.55,  271342.45,  325610.94],
  [470,     195035.20,  259574.13,  276879.07,  332254.88],
  [480,     198910.71,  264732.07,  282380.87,  338857.05],
  [490,     202815.61,  269929.14,  287924.42,  345509.30],
  [500,     207402.61,  276034.03,  294436.29,  353323.55],
  [600,     218809.09,  291215.01,  310629.34,  372755.21],
  [700,     253597.48,  337515.19,  360016.20,  432019.44],
  [800,     288384.19,  383813.14,  409400.68,  491280.82],
  [900,     323184.42,  430129.08,  458804.35,  550565.22],
  [1000,    357902.57,  476335.79,  508091.51,  609709.81],
];

// POST: Ejecutar migración de tarifas 2026
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'No admin client' }, { status: 500 });
    }

    // Truncar tarifas de tonelaje existentes
    await supabaseAdmin.schema('mercure').from('tariff_tonnage_rates').delete().neq('id', 0);
    
    // Truncar tarifas base existentes para las rutas que vamos a actualizar
    await supabaseAdmin.schema('mercure').from('tariffs').delete().neq('id', 0);

    // ============================================
    // TARIFAS POR TONELAJE (+1000kg)
    // ============================================

    const tonnageRates = [
      // Capital Federal / Buenos Aires -> Jujuy
      { origin: 'Capital Federal', destination: 'Jujuy', delivery_type: 'deposito', tonnage_from_kg: 1001, tonnage_to_kg: 5000, price_per_kg: 322.01, includes_iva: false },
      { origin: 'Capital Federal', destination: 'Jujuy', delivery_type: 'deposito', tonnage_from_kg: 5001, tonnage_to_kg: 10000, price_per_kg: 289.88, includes_iva: false },
      { origin: 'Capital Federal', destination: 'Jujuy', delivery_type: 'deposito', tonnage_from_kg: 10001, tonnage_to_kg: null, price_per_kg: 275.14, includes_iva: false },
      { origin: 'Buenos Aires', destination: 'Jujuy', delivery_type: 'deposito', tonnage_from_kg: 1001, tonnage_to_kg: 5000, price_per_kg: 322.01, includes_iva: false },
      { origin: 'Buenos Aires', destination: 'Jujuy', delivery_type: 'deposito', tonnage_from_kg: 5001, tonnage_to_kg: 10000, price_per_kg: 289.88, includes_iva: false },
      { origin: 'Buenos Aires', destination: 'Jujuy', delivery_type: 'deposito', tonnage_from_kg: 10001, tonnage_to_kg: null, price_per_kg: 275.14, includes_iva: false },
      
      // Capital Federal / Buenos Aires -> Salta
      { origin: 'Capital Federal', destination: 'Salta', delivery_type: 'deposito', tonnage_from_kg: 1001, tonnage_to_kg: 5000, price_per_kg: 428.56, includes_iva: false },
      { origin: 'Capital Federal', destination: 'Salta', delivery_type: 'deposito', tonnage_from_kg: 5001, tonnage_to_kg: 10000, price_per_kg: 385.80, includes_iva: false },
      { origin: 'Capital Federal', destination: 'Salta', delivery_type: 'deposito', tonnage_from_kg: 10001, tonnage_to_kg: null, price_per_kg: 347.01, includes_iva: false },
      { origin: 'Buenos Aires', destination: 'Salta', delivery_type: 'deposito', tonnage_from_kg: 1001, tonnage_to_kg: 5000, price_per_kg: 428.56, includes_iva: false },
      { origin: 'Buenos Aires', destination: 'Salta', delivery_type: 'deposito', tonnage_from_kg: 5001, tonnage_to_kg: 10000, price_per_kg: 385.80, includes_iva: false },
      { origin: 'Buenos Aires', destination: 'Salta', delivery_type: 'deposito', tonnage_from_kg: 10001, tonnage_to_kg: null, price_per_kg: 347.01, includes_iva: false },

      // Rosario -> Jujuy
      { origin: 'Rosario', destination: 'Jujuy', delivery_type: 'deposito', tonnage_from_kg: 1001, tonnage_to_kg: 5000, price_per_kg: 457.13, includes_iva: false },
      { origin: 'Rosario', destination: 'Jujuy', delivery_type: 'deposito', tonnage_from_kg: 5001, tonnage_to_kg: 10000, price_per_kg: 411.52, includes_iva: false },
      { origin: 'Rosario', destination: 'Jujuy', delivery_type: 'deposito', tonnage_from_kg: 10001, tonnage_to_kg: null, price_per_kg: 370.14, includes_iva: false },

      // Rosario -> Salta
      { origin: 'Rosario', destination: 'Salta', delivery_type: 'deposito', tonnage_from_kg: 1001, tonnage_to_kg: 5000, price_per_kg: 548.56, includes_iva: false },
      { origin: 'Rosario', destination: 'Salta', delivery_type: 'deposito', tonnage_from_kg: 5001, tonnage_to_kg: 10000, price_per_kg: 493.82, includes_iva: false },
      { origin: 'Rosario', destination: 'Salta', delivery_type: 'deposito', tonnage_from_kg: 10001, tonnage_to_kg: null, price_per_kg: 444.17, includes_iva: false },
    ];

    const { error: tonnageError } = await supabaseAdmin
      .schema('mercure')
      .from('tariff_tonnage_rates')
      .insert(tonnageRates);

    if (tonnageError) {
      throw new Error(`Error insertando tarifas de tonelaje: ${tonnageError.message}`);
    }

    // ============================================
    // TARIFAS BASE POR PESO (10kg - 1000kg)
    // ============================================
    
    // Generar tarifas base para cada ruta
    const baseTariffs: any[] = [];
    
    // Rutas con sus precios por m3
    const routes = [
      { origin: 'Capital Federal', destination: 'Jujuy', priceIndex: 1, pricePerM3: 123500 },
      { origin: 'Buenos Aires', destination: 'Jujuy', priceIndex: 1, pricePerM3: 123500 },
      { origin: 'Lanus', destination: 'Jujuy', priceIndex: 1, pricePerM3: 123500 },
      { origin: 'Lanús', destination: 'Jujuy', priceIndex: 1, pricePerM3: 123500 },
      { origin: 'Capital Federal', destination: 'Salta', priceIndex: 2, pricePerM3: 164500 },
      { origin: 'Buenos Aires', destination: 'Salta', priceIndex: 2, pricePerM3: 164500 },
      { origin: 'Lanus', destination: 'Salta', priceIndex: 2, pricePerM3: 164500 },
      { origin: 'Lanús', destination: 'Salta', priceIndex: 2, pricePerM3: 164500 },
      { origin: 'Rosario', destination: 'Jujuy', priceIndex: 3, pricePerM3: 175500 },
      { origin: 'Rosario', destination: 'Salta', priceIndex: 4, pricePerM3: 210500 },
    ];
    
    for (const route of routes) {
      let prevWeight = 0;
      for (const tarifa of TARIFAS_BASE_DEPOSITO) {
        const [weightTo, cfJuj, cfSalta, rosJuj, rosSalta] = tarifa;
        const prices = [0, cfJuj, cfSalta, rosJuj, rosSalta];
        const price = prices[route.priceIndex];
        
        baseTariffs.push({
          origin: route.origin,
          destination: route.destination,
          delivery_type: 'deposito',
          weight_from_kg: prevWeight + 1,
          weight_to_kg: weightTo,
          price: price,
          price_per_m3: route.pricePerM3,
          includes_iva: false,
          tariff_type: 'standard',
        });
        
        prevWeight = weightTo;
      }
    }
    
    // Insertar en batches para evitar timeout
    const batchSize = 100;
    for (let i = 0; i < baseTariffs.length; i += batchSize) {
      const batch = baseTariffs.slice(i, i + batchSize);
      const { error: baseError } = await supabaseAdmin
        .schema('mercure')
        .from('tariffs')
        .insert(batch);
      
      if (baseError) {
        console.error(`Error en batch ${i}:`, baseError);
        throw new Error(`Error insertando tarifas base: ${baseError.message}`);
      }
    }

    // Los precios por M3 ya están incluidos en las tarifas base

    // ============================================
    // CONTAR RESULTADOS
    // ============================================
    const { count: tonnageCount } = await supabaseAdmin
      .schema('mercure')
      .from('tariff_tonnage_rates')
      .select('*', { count: 'exact', head: true });

    const { count: baseCount } = await supabaseAdmin
      .schema('mercure')
      .from('tariffs')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: 'Tarifas 2026 cargadas correctamente',
      stats: {
        tarifasTonelaje: tonnageCount,
        tarifasBase: baseCount,
        rutas: routes.length,
        rangosPeso: TARIFAS_BASE_DEPOSITO.length,
      }
    });

  } catch (error) {
    console.error('Error ejecutando migración:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error interno' 
    }, { status: 500 });
  }
}

// GET: Obtener tarifas actuales
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'No admin client' }, { status: 500 });
    }

    const { data: tonnageRates } = await supabaseAdmin
      .schema('mercure')
      .from('tariff_tonnage_rates')
      .select('*')
      .order('origin')
      .order('destination')
      .order('tonnage_from_kg');

    const { data: baseTariffs } = await supabaseAdmin
      .schema('mercure')
      .from('tariffs')
      .select('id, origin, destination, weight_from_kg, weight_to_kg, price, price_per_m3, delivery_type')
      .not('price_per_m3', 'is', null)
      .order('origin')
      .order('destination')
      .limit(50);

    return NextResponse.json({
      tonnageRates,
      baseTariffs,
      summary: {
        tonnageCount: tonnageRates?.length || 0,
        baseTariffsWithM3: baseTariffs?.length || 0,
      }
    });

  } catch (error) {
    console.error('Error obteniendo tarifas:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error interno' 
    }, { status: 500 });
  }
}


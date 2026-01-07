import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
const mercure = () => supabaseClient.schema('mercure');

// Tipos de camino de pricing
type PricingPath = 'A' | 'B' | 'C';

// Normalizar nombres de ciudades para búsqueda de tarifas
function normalizeCity(city: string): string[] {
  const normalized = city.toLowerCase().trim();
  
  // Mapeo de variaciones a nombres en la DB
  const mappings: Record<string, string[]> = {
    'jujuy': ['San Salvador de Jujuy', 'Jujuy', 'S.S. de Jujuy'],
    'san salvador de jujuy': ['San Salvador de Jujuy', 'Jujuy', 'S.S. de Jujuy'],
    's.s. de jujuy': ['San Salvador de Jujuy', 'Jujuy', 'S.S. de Jujuy'],
    'buenos aires': ['Buenos Aires', 'BUENOS AIRES', 'Bs As', 'CABA', 'Capital Federal'],
    'bs as': ['Buenos Aires', 'BUENOS AIRES', 'Bs As', 'CABA'],
    'caba': ['Buenos Aires', 'BUENOS AIRES', 'Bs As', 'CABA'],
    'cordoba': ['Córdoba', 'Cordoba', 'CORDOBA'],
    'córdoba': ['Córdoba', 'Cordoba', 'CORDOBA'],
    'rosario': ['Rosario', 'ROSARIO'],
    'salta': ['Salta', 'SALTA', 'Salta Capital'],
    'salta capital': ['Salta', 'SALTA', 'Salta Capital'],
    'tucuman': ['Tucumán', 'Tucuman', 'TUCUMAN', 'San Miguel de Tucumán'],
    'tucumán': ['Tucumán', 'Tucuman', 'TUCUMAN', 'San Miguel de Tucumán'],
    'san miguel de tucuman': ['Tucumán', 'Tucuman', 'San Miguel de Tucumán'],
    'san miguel de tucumán': ['Tucumán', 'Tucuman', 'San Miguel de Tucumán'],
    'mendoza': ['Mendoza', 'MENDOZA'],
    'lanus': ['Lanús', 'Lanus', 'LANUS'],
    'lanús': ['Lanús', 'Lanus', 'LANUS'],
  };
  
  return mappings[normalized] || [city];
}

interface DebugInfo {
  input: {
    weightKg: number;
    volumeM3: number;
    declaredValue: number;
    origin: string;
    destination: string;
  };
  // NUEVO: Comparación de importes según Regla de Oro
  comparacionImportes: {
    pesoKg: number;
    volumenM3: number;
    importePorPeso: number;
    importePorVolumen: number;
    precioPorM3: number | null;
    criterioGanador: 'PESO' | 'VOLUMEN' | 'SOLO_PESO' | 'SOLO_VOLUMEN' | 'SIN_DATOS';
    explicacion: string;
  };
  tarifa: {
    encontrada: boolean;
    id?: number;
    origen?: string;
    destino?: string;
    rangoKg?: string;
    precioLista?: number;
    precioPorM3?: number;
    queryUsada?: string;
  };
  calculo: {
    fleteLista: number;
    modificador?: number;
    fleteConModificador: number;
    valorDeclarado: number;
    tasaSeguro: number;
    seguro: number;
    total: number;
    formula: string;
  };
}

// Tarifa especial por cliente
interface SpecialTariff {
  id: number;
  name: string;
  description: string | null;
  condition_type: string;
  condition_values: Record<string, any>;
  pricing_type: string;
  pricing_values: Record<string, any>;
  origin: string | null;
  destination: string | null;
  priority: number;
  matches: boolean;
  matchReason?: string;
}

interface PricingResult {
  path: PricingPath;
  pathName: string;
  tag: {
    color: 'green' | 'yellow' | 'red';
    label: string;
    description: string;
  };
  client: {
    id: number | null;
    name: string;
    cuit: string | null;
    isNew: boolean;
    type: string;
  };
  pricing: {
    source: string;
    price: number | null;
    breakdown?: Record<string, number>;
    quotationId?: number;
    tariffId?: number;
    specialTariffId?: number;
    validUntil?: string;
  };
  quotation?: {
    id: number;
    declaredWeight: number;
    declaredPackages: number;
    tolerance: number;
  };
  validation?: {
    needsReview: boolean;
    reason?: string;
  };
  commercialTerms?: {
    tariffType: string;
    tariffModifier: number;
    insuranceRate: number;
    creditDays: number;
  };
  // Tarifas especiales disponibles para este cliente
  specialTariffs?: SpecialTariff[];
  // Tarifa especial aplicada automáticamente (si matchea)
  appliedSpecialTariff?: SpecialTariff;
  debug?: DebugInfo;
}

// ============================================================================
// REGLA DE ORO (Mercure/Melisa): Comparación de IMPORTES, no de Kilos
// El sistema NO convierte m³ a kg volumétrico.
// En su lugar, calcula cuánta plata da cada método y se queda con el mayor.
// 
// Algoritmo:
// 1. Calcular IMPORTE por peso: buscar_tarifa_kg(peso_real)
// 2. Calcular IMPORTE por volumen: volumen_m3 × precio_por_m3
// 3. Precio final = MAX(importe_peso, importe_volumen)
// ============================================================================

const DEFAULT_INSURANCE_RATE = 0.008; // 8 por mil
const TONNAGE_THRESHOLD = 1000; // Umbral para tarifas por tonelaje

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      clientId,
      recipientCuit, 
      recipientName,
      origin,
      destination,
      packageQuantity,
      weightKg,
      volumeM3,
      declaredValue,
      cargo
    } = body;

    // Normalizar datos de carga
    const actualWeightKg = cargo?.weightKg ?? weightKg ?? 0;
    const actualVolumeM3 = cargo?.volumeM3 ?? volumeM3 ?? 0;
    const actualDeclaredValue = cargo?.declaredValue ?? declaredValue ?? 0;
    const actualOrigin = origin || 'Buenos Aires';
    const actualDestination = destination || 'San Salvador de Jujuy';

    // PASO 1: Buscar cliente por ID, CUIT o nombre
    let client = null;
    
    if (clientId) {
      const { data } = await mercure()
        .from('entities')
        .select('id, legal_name, tax_id, client_type, payment_terms, assigned_tariff_id, delivery_type')
        .eq('id', clientId)
        .single();
      client = data;
    }
    
    if (!client && recipientCuit) {
      const { data } = await mercure()
        .from('entities')
        .select('id, legal_name, tax_id, client_type, payment_terms, assigned_tariff_id, delivery_type')
        .eq('tax_id', recipientCuit)
        .single();
      client = data;
    }
    
    if (!client && recipientName) {
      const { data } = await mercure()
        .from('entities')
        .select('id, legal_name, tax_id, client_type, payment_terms, assigned_tariff_id, delivery_type')
        .ilike('legal_name', `%${recipientName}%`)
        .limit(1)
        .single();
      client = data;
    }

    // Verificar términos comerciales y tarifas especiales
    let hasCommercialTerms = false;
    let hasSpecialTariffs = false;
    if (client) {
      console.log('[detect-pricing] Client found:', client.id, client.legal_name);
      
      // Check client_commercial_terms
      const { data: terms, error: termsError } = await mercure()
        .from('client_commercial_terms')
        .select('id')
        .eq('entity_id', client.id)
        .single();
      hasCommercialTerms = !!terms;
      console.log('[detect-pricing] Commercial terms:', hasCommercialTerms, termsError?.message || '');
      
      // Check client_special_tariffs (tarifas especiales activas)
      const { data: specialTariffs, error: specialError } = await mercure()
        .from('client_special_tariffs')
        .select('id, name, pricing_type')
        .eq('entity_id', client.id)
        .eq('is_active', true)
        .limit(1);
      hasSpecialTariffs = !!(specialTariffs && specialTariffs.length > 0);
      console.log('[detect-pricing] Special tariffs:', hasSpecialTariffs, specialTariffs, specialError?.message || '');
    }

    // Input común para debug
    const debugInput = {
      weightKg: actualWeightKg,
      volumeM3: actualVolumeM3,
      declaredValue: actualDeclaredValue,
      origin: actualOrigin,
      destination: actualDestination,
    };

    // CAMINO A: Cliente Cuenta Corriente, con términos comerciales, o con tarifas especiales
    if (client && (client.client_type === 'regular' || client.payment_terms === 'cuenta_corriente' || hasCommercialTerms || hasSpecialTariffs)) {
      const result = await handlePathA(client, { 
        packageQuantity, 
        weightKg: actualWeightKg, 
        volumeM3: actualVolumeM3, 
        declaredValue: actualDeclaredValue,
        origin: actualOrigin,
        destination: actualDestination,
      }, debugInput);
      return NextResponse.json(result);
    }

    // PASO 2: Buscar cotización pendiente
    const quotation = await findPendingQuotation(recipientCuit, recipientName, actualDestination);

    // CAMINO B: Tiene cotización del bot
    if (quotation) {
      const result = await handlePathB(client, quotation, { packageQuantity, weightKg: actualWeightKg });
      return NextResponse.json(result);
    }

    // CAMINO C: Doña Rosa - Tarifa general
    const result = await handlePathC(client, recipientName, { 
      packageQuantity, 
      weightKg: actualWeightKg, 
      volumeM3: actualVolumeM3, 
      declaredValue: actualDeclaredValue,
      origin: actualOrigin,
      destination: actualDestination,
    }, debugInput);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error detecting pricing:', error);
    return NextResponse.json(
      { error: 'Error al detectar pricing' },
      { status: 500 }
    );
  }
}

// Buscar tarifa por tonelaje (para cargas +1000kg)
async function buscarTarifaTonelaje(
  origin: string,
  destination: string,
  pesoKg: number,
  deliveryType: 'deposito' | 'domicilio' = 'deposito'
): Promise<{ tarifa: any | null; debug: string }> {
  const originsToTry = normalizeCity(origin);
  const destinationsToTry = normalizeCity(destination);
  
  console.log(`[detect-pricing] Buscando tarifa por tonelaje: ${originsToTry.join('/')} -> ${destinationsToTry.join('/')} para ${pesoKg}kg (${deliveryType})`);
  
  for (const orig of originsToTry) {
    for (const dest of destinationsToTry) {
      // Buscar tarifa donde el peso esté en el rango
      const { data: tariff } = await mercure()
        .from('tariff_tonnage_rates')
        .select('*')
        .ilike('origin', orig)
        .ilike('destination', dest)
        .eq('delivery_type', deliveryType)
        .eq('is_active', true)
        .lte('tonnage_from_kg', pesoKg)
        .or(`tonnage_to_kg.is.null,tonnage_to_kg.gte.${pesoKg}`)
        .order('tonnage_from_kg', { ascending: true })
        .limit(1)
        .single();
      
      if (tariff) {
        return {
          tarifa: tariff,
          debug: `TONELAJE: ${orig} -> ${dest}, ${tariff.tonnage_from_kg}-${tariff.tonnage_to_kg || '+'}kg = $${tariff.price_per_kg}/kg`
        };
      }
    }
  }
  
  return { tarifa: null, debug: `No hay tarifa de tonelaje para ${origin} -> ${destination}, ${pesoKg}kg (${deliveryType})` };
}

// Buscar tarifa por origen, destino y peso
// NUEVO: También busca precio_per_m3 para comparación de importes
async function buscarTarifa(
  origin: string, 
  destination: string, 
  pesoKg: number,
  deliveryType: 'deposito' | 'domicilio' = 'deposito'
): Promise<{ tarifa: any | null; debug: string; usaTonelaje?: boolean; precioPorM3?: number | null }> {
  
  const originsToTry = normalizeCity(origin);
  const destinationsToTry = normalizeCity(destination);
  
  // Si el peso supera umbral de tonelaje, buscar primero en tarifas de tonelaje
  if (pesoKg > TONNAGE_THRESHOLD) {
    const { tarifa: tarifaTonelaje, debug: debugTonelaje } = await buscarTarifaTonelaje(
      origin, destination, pesoKg, deliveryType
    );
    if (tarifaTonelaje) {
      // Buscar precio por M3 de la misma ruta
      const precioPorM3 = await buscarPrecioPorM3(originsToTry, destinationsToTry, deliveryType);
      return { tarifa: tarifaTonelaje, debug: debugTonelaje, usaTonelaje: true, precioPorM3 };
    }
  }
  
  // Redondear peso al múltiplo de 10 más cercano hacia arriba
  const weightBucket = Math.ceil(pesoKg / 10) * 10;
  
  console.log(`[detect-pricing] Buscando tarifa: ${originsToTry.join('/')} -> ${destinationsToTry.join('/')} para ${weightBucket}kg (${deliveryType})`);
  
  // Intentar encontrar tarifa con origen, destino y delivery_type
  for (const orig of originsToTry) {
    for (const dest of destinationsToTry) {
      const { data: tariff } = await mercure()
        .from('tariffs')
        .select('*')
        .ilike('origin', orig)
        .ilike('destination', dest)
        .eq('delivery_type', deliveryType)
        .neq('tariff_type', 'volume')
        .gte('weight_to_kg', weightBucket)
        .order('weight_to_kg', { ascending: true })
        .limit(1)
        .single();
      
      if (tariff) {
        return { 
          tarifa: tariff, 
          debug: `Encontrada: ${orig} -> ${dest}, ${tariff.weight_from_kg}-${tariff.weight_to_kg}kg = $${tariff.price} (${deliveryType}${tariff.includes_iva ? ', +IVA' : ''})`,
          precioPorM3: tariff.price_per_m3 ? parseFloat(tariff.price_per_m3) : null
        };
      }
    }
  }
  
  // Fallback: buscar sin filtrar por delivery_type
  for (const orig of originsToTry) {
    for (const dest of destinationsToTry) {
      const { data: tariff } = await mercure()
        .from('tariffs')
        .select('*')
        .ilike('origin', orig)
        .ilike('destination', dest)
        .neq('tariff_type', 'volume')
        .gte('weight_to_kg', weightBucket)
        .order('weight_to_kg', { ascending: true })
        .limit(1)
        .single();
      
      if (tariff) {
        return { 
          tarifa: tariff, 
          debug: `Encontrada (sin filtro delivery): ${orig} -> ${dest}, ${tariff.weight_from_kg}-${tariff.weight_to_kg}kg = $${tariff.price}`,
          precioPorM3: tariff.price_per_m3 ? parseFloat(tariff.price_per_m3) : null
        };
      }
    }
  }
  
  // Fallback: intentar solo con el origen (cualquier destino del mismo origen)
  console.log(`[detect-pricing] No hay tarifa específica para ${origin}->${destination}, buscando por origen...`);
  
  for (const orig of originsToTry) {
    const { data: fallbackTariff } = await mercure()
      .from('tariffs')
      .select('*')
      .ilike('origin', orig)
      .neq('tariff_type', 'volume')
      .gte('weight_to_kg', weightBucket)
      .order('weight_to_kg', { ascending: true })
      .limit(1)
      .single();
    
    if (fallbackTariff) {
      return { 
        tarifa: fallbackTariff, 
        debug: `FALLBACK (mismo origen, destino diferente): ${fallbackTariff.origin} -> ${fallbackTariff.destination}, ${fallbackTariff.weight_to_kg}kg = $${fallbackTariff.price}. NOTA: No hay tarifa para ${destination}.`,
        precioPorM3: fallbackTariff.price_per_m3 ? parseFloat(fallbackTariff.price_per_m3) : null
      };
    }
  }
  
  return { tarifa: null, debug: `NO ENCONTRADA para ${origin} -> ${destination}, ${weightBucket}kg. Agregar tarifario para esta ruta.`, precioPorM3: null };
}

// Buscar precio por M3 para una ruta específica
async function buscarPrecioPorM3(
  originsToTry: string[],
  destinationsToTry: string[],
  deliveryType: 'deposito' | 'domicilio' = 'deposito'
): Promise<number | null> {
  // Buscar cualquier tarifa de la ruta que tenga price_per_m3
  for (const orig of originsToTry) {
    for (const dest of destinationsToTry) {
      const { data: tariff } = await mercure()
        .from('tariffs')
        .select('price_per_m3')
        .ilike('origin', orig)
        .ilike('destination', dest)
        .eq('delivery_type', deliveryType)
        .not('price_per_m3', 'is', null)
        .limit(1)
        .single();
      
      if (tariff?.price_per_m3) {
        return parseFloat(tariff.price_per_m3);
      }
    }
  }
  
  // Fallback sin delivery_type
  for (const orig of originsToTry) {
    for (const dest of destinationsToTry) {
      const { data: tariff } = await mercure()
        .from('tariffs')
        .select('price_per_m3')
        .ilike('origin', orig)
        .ilike('destination', dest)
        .not('price_per_m3', 'is', null)
        .limit(1)
        .single();
      
      if (tariff?.price_per_m3) {
        return parseFloat(tariff.price_per_m3);
      }
    }
  }
  
  return null;
}

// ============================================================================
// REGLA DE ORO MERCURE: Comparación de IMPORTES (no de kilos)
// ============================================================================
// 
// Algoritmo (según Melisa):
// A. Cálculo por PESO REAL:
//    - Toma los Kilos reales de la balanza
//    - Busca en el tarifario el precio para ese rango de kilos
//    - Resultado A: importe por peso
//
// B. Cálculo por VOLUMEN REAL:
//    - Toma los Metros Cúbicos reales
//    - Busca el valor del m³ en el tarifario
//    - Multiplica: m³ × precio_por_m3
//    - Resultado B: importe por volumen
//
// C. La Decisión:
//    - Precio Final = MAX(Resultado A, Resultado B)
//
// CRÍTICO: NO convertir m³ a kg volumétrico (m³ × 300 = kg). 
//          Eso es lo que Melisa dice que está mal.
// ============================================================================

interface ComparacionImportes {
  pesoKg: number;
  volumenM3: number;
  
  // Cálculo por peso
  importePorPeso: number;
  tarifaPesoUsada: string;
  
  // Cálculo por volumen
  importePorVolumen: number;
  precioPorM3: number | null;
  
  // Decisión final
  importeFinal: number;
  criterioGanador: 'PESO' | 'VOLUMEN' | 'SOLO_PESO' | 'SOLO_VOLUMEN' | 'SIN_DATOS';
  explicacion: string;
}

// Comparar importes según Regla de Oro de Mercure
function compararImportes(
  pesoKg: number,
  volumenM3: number,
  importePorPeso: number,
  precioPorM3: number | null
): ComparacionImportes {
  
  const importePorVolumen = (precioPorM3 && volumenM3 > 0) 
    ? volumenM3 * precioPorM3 
    : 0;
  
  let importeFinal = 0;
  let criterioGanador: ComparacionImportes['criterioGanador'] = 'SIN_DATOS';
  let explicacion = '';
  
  const tienePeso = pesoKg > 0 && importePorPeso > 0;
  const tieneVolumen = volumenM3 > 0 && precioPorM3 && precioPorM3 > 0;
  
  if (tienePeso && tieneVolumen) {
    // REGLA DE ORO: Comparar importes, quedarse con el mayor
    if (importePorVolumen > importePorPeso) {
      criterioGanador = 'VOLUMEN';
      importeFinal = importePorVolumen;
      explicacion = `Comparación de importes: 
        → Por PESO: ${pesoKg}kg = $${importePorPeso.toLocaleString('es-AR')}
        → Por VOLUMEN: ${volumenM3}m³ × $${precioPorM3!.toLocaleString('es-AR')}/m³ = $${importePorVolumen.toLocaleString('es-AR')}
        ✓ GANA VOLUMEN ($${importePorVolumen.toLocaleString('es-AR')} > $${importePorPeso.toLocaleString('es-AR')})`;
    } else {
      criterioGanador = 'PESO';
      importeFinal = importePorPeso;
      explicacion = `Comparación de importes: 
        → Por PESO: ${pesoKg}kg = $${importePorPeso.toLocaleString('es-AR')}
        → Por VOLUMEN: ${volumenM3}m³ × $${precioPorM3!.toLocaleString('es-AR')}/m³ = $${importePorVolumen.toLocaleString('es-AR')}
        ✓ GANA PESO ($${importePorPeso.toLocaleString('es-AR')} ≥ $${importePorVolumen.toLocaleString('es-AR')})`;
    }
  } else if (tienePeso) {
    criterioGanador = 'SOLO_PESO';
    importeFinal = importePorPeso;
    explicacion = `Solo hay peso (${pesoKg}kg) = $${importePorPeso.toLocaleString('es-AR')}${!precioPorM3 ? ' (sin tarifa de m³ configurada)' : ''}`;
  } else if (tieneVolumen) {
    criterioGanador = 'SOLO_VOLUMEN';
    importeFinal = importePorVolumen;
    explicacion = `Solo hay volumen (${volumenM3}m³ × $${precioPorM3!.toLocaleString('es-AR')}/m³) = $${importePorVolumen.toLocaleString('es-AR')}`;
  } else {
    criterioGanador = 'SIN_DATOS';
    importeFinal = 0;
    explicacion = 'No hay peso ni volumen → No se puede calcular';
  }
  
  return {
    pesoKg,
    volumenM3,
    importePorPeso,
    tarifaPesoUsada: '',  // Se llena después
    importePorVolumen,
    precioPorM3,
    importeFinal,
    criterioGanador,
    explicacion
  };
}

// CAMINO A: Cliente Cuenta Corriente
// Implementa la REGLA DE ORO: Comparación de IMPORTES (no de kilos)
async function handlePathA(
  client: any, 
  cargo: { packageQuantity?: number; weightKg?: number; volumeM3?: number; declaredValue?: number; origin?: string; destination?: string },
  debugInput: DebugInfo['input']
): Promise<PricingResult> {
  
  // Delivery type del cliente (default: deposito)
  const deliveryType: 'deposito' | 'domicilio' = client.delivery_type || 'deposito';
  
  // Buscar términos comerciales del cliente
  const { data: terms } = await mercure()
    .from('client_commercial_terms')
    .select('*')
    .eq('entity_id', client.id)
    .eq('is_active', true)
    .single();

  const tariffModifier = parseFloat(terms?.tariff_modifier || '0');
  const insuranceRate = parseFloat(terms?.insurance_rate || String(DEFAULT_INSURANCE_RATE));

  // Buscar tarifas especiales del cliente
  const { tariffs: specialTariffs, matched: matchedSpecialTariff } = await findSpecialTariffs(
    client.id,
    cargo,
    cargo.origin,
    cargo.destination
  );

  const pesoKg = cargo.weightKg || 0;
  const volumenM3 = cargo.volumeM3 || 0;
  
  let price: number | null = null;
  let breakdown: Record<string, number> = {};
  let specialTariffId: number | undefined = undefined;
  
  // Inicializar debug con valores por defecto
  const debug: DebugInfo = {
    input: debugInput,
    comparacionImportes: {
      pesoKg,
      volumenM3,
      importePorPeso: 0,
      importePorVolumen: 0,
      precioPorM3: null,
      criterioGanador: 'SIN_DATOS',
      explicacion: '',
    },
    tarifa: { encontrada: false },
    calculo: {
      fleteLista: 0,
      fleteConModificador: 0,
      valorDeclarado: cargo.declaredValue || 0,
      tasaSeguro: insuranceRate,
      seguro: 0,
      total: 0,
      formula: '',
    },
  };

  // PASO 1: Buscar tarifa por PESO (usando peso real, no volumétrico)
  const { tarifa, debug: tarifaDebug, usaTonelaje, precioPorM3 } = await buscarTarifa(
    cargo.origin || 'Buenos Aires', 
    cargo.destination || 'San Salvador de Jujuy', 
    pesoKg > 0 ? pesoKg : 1, // Mínimo 1kg para buscar
    deliveryType
  );

  if (tarifa) {
    // PASO 2: Calcular IMPORTE por peso
    let importePorPeso: number;
    if (usaTonelaje) {
      importePorPeso = pesoKg * (parseFloat(tarifa.price_per_kg) || 0);
      debug.tarifa = {
        encontrada: true,
        id: tarifa.id,
        origen: tarifa.origin,
        destino: tarifa.destination,
        rangoKg: `${tarifa.tonnage_from_kg}-${tarifa.tonnage_to_kg || '+'}kg (tonelaje)`,
        precioLista: importePorPeso,
        precioPorM3: precioPorM3 || undefined,
        queryUsada: tarifaDebug,
      };
    } else {
      importePorPeso = parseFloat(tarifa.price) || 0;
      debug.tarifa = {
        encontrada: true,
        id: tarifa.id,
        origen: tarifa.origin,
        destino: tarifa.destination,
        rangoKg: `${tarifa.weight_from_kg}-${tarifa.weight_to_kg}`,
        precioLista: importePorPeso,
        precioPorM3: precioPorM3 || undefined,
        queryUsada: tarifaDebug,
      };
    }

    // PASO 3: REGLA DE ORO - Comparar IMPORTES
    const comparacion = compararImportes(pesoKg, volumenM3, importePorPeso, precioPorM3 ?? null);
    debug.comparacionImportes = {
      pesoKg: comparacion.pesoKg,
      volumenM3: comparacion.volumenM3,
      importePorPeso: comparacion.importePorPeso,
      importePorVolumen: comparacion.importePorVolumen,
      precioPorM3: comparacion.precioPorM3,
      criterioGanador: comparacion.criterioGanador,
      explicacion: comparacion.explicacion,
    };

    const basePrice = comparacion.importeFinal;

    // Si hay tarifa especial que matchea, usarla (override)
    if (matchedSpecialTariff) {
      const resultado = calcularPrecioEspecial(
        matchedSpecialTariff,
        cargo,
        basePrice,
        insuranceRate
      );
      price = resultado.price;
      breakdown = resultado.breakdown;
      specialTariffId = matchedSpecialTariff.id;
      
      debug.calculo = {
        fleteLista: basePrice,
        fleteConModificador: resultado.price,
        valorDeclarado: cargo.declaredValue || 0,
        tasaSeguro: insuranceRate,
        seguro: breakdown.seguro || 0,
        total: resultado.price,
        formula: resultado.formula,
      };
    } else {
      // Usar tarifa calculada con Regla de Oro + modificador comercial
      breakdown.flete_lista = basePrice;
      breakdown.criterio_usado = comparacion.criterioGanador === 'VOLUMEN' || comparacion.criterioGanador === 'SOLO_VOLUMEN' ? 1 : 0;
      breakdown.peso_kg = pesoKg;
      breakdown.volumen_m3 = volumenM3;
      breakdown.importe_por_peso = comparacion.importePorPeso;
      breakdown.importe_por_volumen = comparacion.importePorVolumen;
      breakdown.delivery_type = deliveryType === 'domicilio' ? 1 : 0;
      if (usaTonelaje) {
        breakdown.es_tonelaje = 1;
        breakdown.precio_por_kg = parseFloat(tarifa.price_per_kg) || 0;
      }
      if (precioPorM3) {
        breakdown.precio_por_m3 = precioPorM3;
      }

      let fleteConModificador = basePrice;
      if (tariffModifier !== 0) {
        const modificadorMonto = basePrice * (tariffModifier / 100);
        breakdown.descuento = modificadorMonto;
        fleteConModificador = basePrice + modificadorMonto;
        debug.calculo.modificador = tariffModifier;
      }
      breakdown.flete_final = fleteConModificador;

      let seguro = 0;
      if (cargo.declaredValue && insuranceRate > 0) {
        seguro = cargo.declaredValue * insuranceRate;
        breakdown.seguro = seguro;
      }

      price = fleteConModificador + seguro;

      // Debug del cálculo con Regla de Oro
      const criterioStr = comparacion.criterioGanador === 'VOLUMEN' || comparacion.criterioGanador === 'SOLO_VOLUMEN'
        ? `${volumenM3}m³ × $${precioPorM3?.toLocaleString()}/m³ = $${basePrice.toLocaleString()} (VOLUMEN)`
        : usaTonelaje 
          ? `${pesoKg}kg × $${tarifa.price_per_kg}/kg = $${basePrice.toLocaleString()} (PESO-TONELAJE)`
          : `Tarifa ${tarifa.weight_to_kg}kg = $${basePrice.toLocaleString()} (PESO)`;
      
      debug.calculo = {
        fleteLista: basePrice,
        modificador: tariffModifier !== 0 ? tariffModifier : undefined,
        fleteConModificador,
        valorDeclarado: cargo.declaredValue || 0,
        tasaSeguro: insuranceRate,
        seguro,
        total: price,
        formula: tariffModifier !== 0 
          ? `${criterioStr} ${tariffModifier > 0 ? '+' : ''}${tariffModifier}% = $${fleteConModificador.toLocaleString()} + seguro $${seguro.toLocaleString()} = $${price.toLocaleString()}`
          : `${criterioStr} + seguro $${seguro.toLocaleString()} = $${price.toLocaleString()}`,
      };
    }
  } else {
    debug.tarifa.queryUsada = tarifaDebug;
  }

  // Tag personalizado si aplica tarifa especial
  const tagLabel = matchedSpecialTariff 
    ? `⭐ ${matchedSpecialTariff.name.toUpperCase()}`
    : 'CTA CTE';
  const tagDescription = matchedSpecialTariff
    ? `Tarifa especial: ${matchedSpecialTariff.description || matchedSpecialTariff.name}`
    : `Cliente con contrato - Facturar a fin de mes${tariffModifier !== 0 ? ` (${tariffModifier}%)` : ''}`;

  return {
    path: 'A',
    pathName: matchedSpecialTariff ? 'Tarifa Especial' : 'Cuenta Corriente',
    tag: {
      color: 'green',
      label: tagLabel,
      description: tagDescription
    },
    client: {
      id: client.id,
      name: client.legal_name,
      cuit: client.tax_id,
      isNew: false,
      type: 'regular'
    },
    pricing: {
      source: matchedSpecialTariff ? 'special_tariff' : 'contract',
      price,
      breakdown,
      tariffId: client.assigned_tariff_id,
      specialTariffId,
    },
    commercialTerms: terms ? {
      tariffType: terms.tariff_type,
      tariffModifier: tariffModifier,
      insuranceRate: insuranceRate,
      creditDays: terms.credit_days
    } : undefined,
    // Incluir todas las tarifas especiales disponibles (para mostrar en UI)
    specialTariffs: specialTariffs.length > 0 ? specialTariffs : undefined,
    appliedSpecialTariff: matchedSpecialTariff || undefined,
    debug,
  };
}

// CAMINO B: Cotización del Bot
async function handlePathB(
  client: any | null,
  quotation: any,
  cargo: { packageQuantity?: number; weightKg?: number }
): Promise<PricingResult> {
  
  let needsReview = false;
  let reason = undefined;
  
  const tolerance = quotation.weight_tolerance_percent || 10;
  
  if (quotation.weight_kg && cargo.weightKg) {
    const diff = Math.abs(cargo.weightKg - quotation.weight_kg) / quotation.weight_kg * 100;
    if (diff > tolerance) {
      needsReview = true;
      reason = `Peso real (${cargo.weightKg}kg) difiere ${diff.toFixed(1)}% del cotizado (${quotation.weight_kg}kg)`;
    }
  }

  if (quotation.package_quantity && cargo.packageQuantity) {
    const diff = Math.abs(cargo.packageQuantity - quotation.package_quantity);
    if (diff > 0) {
      needsReview = true;
      reason = `Bultos reales (${cargo.packageQuantity}) difieren de cotizados (${quotation.package_quantity})`;
    }
  }

  return {
    path: 'B',
    pathName: 'Presupuesto Bot',
    tag: {
      color: 'yellow',
      label: `PRESUPUESTO #${quotation.id}`,
      description: needsReview 
        ? 'Verificar carga vs cotización' 
        : 'Precio pre-acordado - Cobrar antes de entregar'
    },
    client: {
      id: client?.id || null,
      name: client?.legal_name || quotation.customer_name,
      cuit: client?.tax_id || quotation.customer_cuit,
      isNew: !client,
      type: 'occasional'
    },
    pricing: {
      source: 'quotation',
      price: quotation.total_price,
      quotationId: quotation.id,
      validUntil: quotation.valid_until
    },
    quotation: {
      id: quotation.id,
      declaredWeight: quotation.weight_kg,
      declaredPackages: quotation.package_quantity,
      tolerance
    },
    validation: needsReview ? { needsReview, reason } : undefined
  };
}

// CAMINO C: Doña Rosa - Tarifa General
// Implementa la REGLA DE ORO: Comparación de IMPORTES (no de kilos)
async function handlePathC(
  client: any | null,
  recipientName: string,
  cargo: { packageQuantity?: number; weightKg?: number; volumeM3?: number; declaredValue?: number; origin?: string; destination?: string },
  debugInput: DebugInfo['input']
): Promise<PricingResult> {
  
  const insuranceRate = DEFAULT_INSURANCE_RATE;
  // Default a deposito para clientes sin tipo definido
  const deliveryType: 'deposito' | 'domicilio' = client?.delivery_type || 'deposito';
  
  const pesoKg = cargo.weightKg || 0;
  const volumenM3 = cargo.volumeM3 || 0;
  
  let price: number | null = null;
  let breakdown: Record<string, number> | undefined = undefined;
  let tariffId: number | undefined = undefined;
  
  const debug: DebugInfo = {
    input: debugInput,
    comparacionImportes: {
      pesoKg,
      volumenM3,
      importePorPeso: 0,
      importePorVolumen: 0,
      precioPorM3: null,
      criterioGanador: 'SIN_DATOS',
      explicacion: '',
    },
    tarifa: { encontrada: false },
    calculo: {
      fleteLista: 0,
      fleteConModificador: 0,
      valorDeclarado: cargo.declaredValue || 0,
      tasaSeguro: insuranceRate,
      seguro: 0,
      total: 0,
      formula: '',
    },
  };

  // PASO 1: Buscar tarifa por PESO (usando peso real, no volumétrico)
  const { tarifa, debug: tarifaDebug, usaTonelaje, precioPorM3 } = await buscarTarifa(
    cargo.origin || 'Buenos Aires', 
    cargo.destination || 'San Salvador de Jujuy', 
    pesoKg > 0 ? pesoKg : 1, // Mínimo 1kg para buscar
    deliveryType
  );

  if (tarifa) {
    tariffId = tarifa.id;
    
    // PASO 2: Calcular IMPORTE por peso
    let importePorPeso: number;
    if (usaTonelaje) {
      importePorPeso = pesoKg * (parseFloat(tarifa.price_per_kg) || 0);
      debug.tarifa = {
        encontrada: true,
        id: tarifa.id,
        origen: tarifa.origin,
        destino: tarifa.destination,
        rangoKg: `${tarifa.tonnage_from_kg}-${tarifa.tonnage_to_kg || '+'}kg (tonelaje)`,
        precioLista: importePorPeso,
        precioPorM3: precioPorM3 || undefined,
        queryUsada: tarifaDebug,
      };
    } else {
      importePorPeso = parseFloat(tarifa.price) || 0;
      debug.tarifa = {
        encontrada: true,
        id: tarifa.id,
        origen: tarifa.origin,
        destino: tarifa.destination,
        rangoKg: `${tarifa.weight_from_kg}-${tarifa.weight_to_kg}`,
        precioLista: importePorPeso,
        precioPorM3: precioPorM3 || undefined,
        queryUsada: tarifaDebug,
      };
    }
    
    // PASO 3: REGLA DE ORO - Comparar IMPORTES
    const comparacion = compararImportes(pesoKg, volumenM3, importePorPeso, precioPorM3 ?? null);
    debug.comparacionImportes = {
      pesoKg: comparacion.pesoKg,
      volumenM3: comparacion.volumenM3,
      importePorPeso: comparacion.importePorPeso,
      importePorVolumen: comparacion.importePorVolumen,
      precioPorM3: comparacion.precioPorM3,
      criterioGanador: comparacion.criterioGanador,
      explicacion: comparacion.explicacion,
    };

    const basePrice = comparacion.importeFinal;
    
    breakdown = {
      flete_lista: basePrice,
      criterio_usado: comparacion.criterioGanador === 'VOLUMEN' || comparacion.criterioGanador === 'SOLO_VOLUMEN' ? 1 : 0,
      peso_kg: pesoKg,
      volumen_m3: volumenM3,
      importe_por_peso: comparacion.importePorPeso,
      importe_por_volumen: comparacion.importePorVolumen,
      delivery_type: deliveryType === 'domicilio' ? 1 : 0,
      flete_final: basePrice
    };
    
    if (usaTonelaje) {
      breakdown.es_tonelaje = 1;
      breakdown.precio_por_kg = parseFloat(tarifa.price_per_kg) || 0;
    }
    if (precioPorM3) {
      breakdown.precio_por_m3 = precioPorM3;
    }
    
    let seguro = 0;
    if (cargo.declaredValue && cargo.declaredValue > 0) {
      seguro = cargo.declaredValue * insuranceRate;
      breakdown.seguro = seguro;
    }
    
    price = basePrice + seguro;
    
    // Debug del cálculo con Regla de Oro
    const criterioStr = comparacion.criterioGanador === 'VOLUMEN' || comparacion.criterioGanador === 'SOLO_VOLUMEN'
      ? `${volumenM3}m³ × $${precioPorM3?.toLocaleString()}/m³ = $${basePrice.toLocaleString()} (VOLUMEN)`
      : usaTonelaje 
        ? `${pesoKg}kg × $${tarifa.price_per_kg}/kg = $${basePrice.toLocaleString()} (PESO-TONELAJE)`
        : `Tarifa ${tarifa.weight_to_kg}kg = $${basePrice.toLocaleString()} (PESO)`;
    
    debug.calculo = {
      fleteLista: basePrice,
      fleteConModificador: basePrice,
      valorDeclarado: cargo.declaredValue || 0,
      tasaSeguro: insuranceRate,
      seguro,
      total: price,
      formula: `${criterioStr} + seguro $${seguro.toLocaleString()} = $${price.toLocaleString()}`,
    };
  } else {
    debug.tarifa.queryUsada = tarifaDebug;
    
    // Fallback: precio por kg (sin comparación de importes porque no hay tarifa)
    const precioPorKg = 500;
    const basePrice = pesoKg * precioPorKg;
    
    breakdown = {
      flete_lista: basePrice,
      peso_kg: pesoKg,
      flete_final: basePrice
    };
    
    let seguro = 0;
    if (cargo.declaredValue && cargo.declaredValue > 0) {
      seguro = cargo.declaredValue * insuranceRate;
      breakdown.seguro = seguro;
    }
    
    price = basePrice + seguro;
    
    debug.calculo = {
      fleteLista: basePrice,
      fleteConModificador: basePrice,
      valorDeclarado: cargo.declaredValue || 0,
      tasaSeguro: insuranceRate,
      seguro,
      total: price,
      formula: `FALLBACK: ${pesoKg}kg × $${precioPorKg}/kg = $${basePrice.toLocaleString()} + $${seguro.toLocaleString()} (seguro) = $${price.toLocaleString()}`,
    };
  }

  return {
    path: 'C',
    pathName: 'Tarifa General',
    tag: {
      color: 'red',
      label: 'TARIFA GRAL',
      description: 'Sin cotización previa - Cobrar ANTES de entregar'
    },
    client: {
      id: client?.id || null,
      name: client?.legal_name || recipientName || 'Cliente nuevo',
      cuit: client?.tax_id || null,
      isNew: !client,
      type: 'occasional'
    },
    pricing: {
      source: 'general',
      price,
      breakdown,
      tariffId
    },
    validation: {
      needsReview: true,
      reason: 'Sin cotización previa - Confirmar precio con cliente'
    },
    debug,
  };
}

// Buscar tarifas especiales del cliente
async function findSpecialTariffs(
  entityId: number,
  cargo: { packageQuantity?: number; weightKg?: number; volumeM3?: number; tipoCarga?: string },
  origin?: string,
  destination?: string
): Promise<{ tariffs: SpecialTariff[]; matched: SpecialTariff | null }> {
  
  // Buscar todas las tarifas especiales activas del cliente
  const { data: tariffs } = await mercure()
    .from('client_special_tariffs')
    .select('*')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .lte('valid_from', new Date().toISOString().split('T')[0])
    .order('priority', { ascending: false });
  
  if (!tariffs || tariffs.length === 0) {
    return { tariffs: [], matched: null };
  }
  
  const originsToTry = origin ? normalizeCity(origin) : [];
  const destinationsToTry = destination ? normalizeCity(destination) : [];
  
  // Evaluar cada tarifa especial
  const evaluatedTariffs: SpecialTariff[] = tariffs.map((t: any) => {
    let matches = true;
    let matchReason = '';
    
    // Verificar vigencia
    if (t.valid_until && new Date(t.valid_until) < new Date()) {
      matches = false;
      matchReason = 'Tarifa vencida';
    }
    
    // Verificar ruta (si está definida)
    if (matches && t.origin) {
      const tarifaOriginsNorm = normalizeCity(t.origin);
      const routeMatches = originsToTry.some(o => 
        tarifaOriginsNorm.some(to => to.toLowerCase() === o.toLowerCase())
      );
      if (!routeMatches) {
        matches = false;
        matchReason = `Origen no coincide (esperado: ${t.origin})`;
      }
    }
    
    if (matches && t.destination) {
      const tarifaDestsNorm = normalizeCity(t.destination);
      const routeMatches = destinationsToTry.some(d => 
        tarifaDestsNorm.some(td => td.toLowerCase() === d.toLowerCase())
      );
      if (!routeMatches) {
        matches = false;
        matchReason = `Destino no coincide (esperado: ${t.destination})`;
      }
    }
    
    // Evaluar condiciones
    if (matches) {
      const conditions = t.condition_values || {};
      
      switch (t.condition_type) {
        case 'peso_minimo':
          if (conditions.peso_minimo_kg && (cargo.weightKg || 0) < conditions.peso_minimo_kg) {
            matches = false;
            matchReason = `Peso ${cargo.weightKg || 0}kg < mínimo ${conditions.peso_minimo_kg}kg`;
          } else if (conditions.peso_minimo_kg) {
            matchReason = `Peso ${cargo.weightKg}kg ≥ mínimo ${conditions.peso_minimo_kg}kg`;
          }
          break;
          
        case 'volumen_minimo':
          if (conditions.volumen_minimo_m3 && (cargo.volumeM3 || 0) < conditions.volumen_minimo_m3) {
            matches = false;
            matchReason = `Volumen ${cargo.volumeM3 || 0}m³ < mínimo ${conditions.volumen_minimo_m3}m³`;
          } else if (conditions.volumen_minimo_m3) {
            matchReason = `Volumen ${cargo.volumeM3}m³ ≥ mínimo ${conditions.volumen_minimo_m3}m³`;
          }
          break;
          
        case 'bultos_minimo':
          if (conditions.bultos_minimo && (cargo.packageQuantity || 0) < conditions.bultos_minimo) {
            matches = false;
            matchReason = `Bultos ${cargo.packageQuantity || 0} < mínimo ${conditions.bultos_minimo}`;
          } else if (conditions.bultos_minimo) {
            matchReason = `Bultos ${cargo.packageQuantity} ≥ mínimo ${conditions.bultos_minimo}`;
          }
          break;
          
        case 'tipo_carga':
          // Tipo de carga se evalúa como sugerencia (no bloquea)
          matchReason = `Tipo de carga: ${conditions.tipo || 'cualquiera'}`;
          break;
          
        case 'cualquiera':
          // Siempre aplica
          matchReason = 'Aplica a cualquier envío';
          break;
          
        default:
          matchReason = 'Condición personalizada';
      }
    }
    
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      condition_type: t.condition_type,
      condition_values: t.condition_values,
      pricing_type: t.pricing_type,
      pricing_values: t.pricing_values,
      origin: t.origin,
      destination: t.destination,
      priority: t.priority,
      insurance_rate: t.insurance_rate,
      matches,
      matchReason,
    };
  });
  
  // Ordenar por prioridad (mayor primero) y encontrar la primera que matchea
  const sortedTariffs = evaluatedTariffs.sort((a, b) => b.priority - a.priority);
  const matched = sortedTariffs.find(t => t.matches) || null;
  
  return { tariffs: sortedTariffs, matched };
}

// Calcular precio con tarifa especial
function calcularPrecioEspecial(
  specialTariff: SpecialTariff & { insurance_rate?: number | null },
  cargo: { weightKg?: number; volumeM3?: number; declaredValue?: number; packageQuantity?: number },
  tarifaBase: number,
  defaultInsuranceRate: number
): { price: number; breakdown: Record<string, number>; formula: string } {
  const pv = specialTariff.pricing_values || {};
  let price = 0;
  const breakdown: Record<string, number> = {};
  let formula = '';
  
  // Usar tasa de seguro específica si está definida, si es 0 es sin seguro
  const insuranceRate = specialTariff.insurance_rate !== null && specialTariff.insurance_rate !== undefined
    ? specialTariff.insurance_rate 
    : defaultInsuranceRate;
  
  switch (specialTariff.pricing_type) {
    case 'fijo':
      price = pv.precio || 0;
      breakdown.tarifa_especial = price;
      formula = `TARIFA ESPECIAL "${specialTariff.name}": $${price.toLocaleString()} (precio fijo)`;
      break;
      
    case 'por_kg':
      const precioPorKg = pv.precio_kg || 0;
      const minimo = pv.minimo || 0;
      const pesoKg = cargo.weightKg || 0;
      const precioCalculado = pesoKg * precioPorKg;
      price = Math.max(precioCalculado, minimo);
      breakdown.peso_kg = pesoKg;
      breakdown.precio_kg = precioPorKg;
      breakdown.tarifa_especial = price;
      formula = `TARIFA ESPECIAL "${specialTariff.name}": ${pesoKg}kg × $${precioPorKg}/kg = $${precioCalculado.toLocaleString()}${minimo > precioCalculado ? ` → mínimo $${minimo.toLocaleString()}` : ''}`;
      break;
      
    case 'por_m3':
      // Precio por metro cúbico
      const precioPorM3 = pv.precio_m3 || 0;
      const volumenM3 = cargo.volumeM3 || 0;
      price = volumenM3 * precioPorM3;
      breakdown.volumen_m3 = volumenM3;
      breakdown.precio_m3 = precioPorM3;
      breakdown.tarifa_especial = price;
      formula = `TARIFA ESPECIAL "${specialTariff.name}": ${volumenM3}m³ × $${precioPorM3.toLocaleString()}/m³ = $${price.toLocaleString()}`;
      break;
      
    case 'por_pallet':
      // Precio por pallet (se estima 1 pallet si no hay cantidad)
      const precioPorPallet = pv.precio_pallet || 0;
      const cantPallets = pv.cant_pallets || 1;
      price = cantPallets * precioPorPallet;
      breakdown.cant_pallets = cantPallets;
      breakdown.precio_pallet = precioPorPallet;
      breakdown.tarifa_especial = price;
      formula = `TARIFA ESPECIAL "${specialTariff.name}": ${cantPallets} pallet(s) × $${precioPorPallet.toLocaleString()}/pallet = $${price.toLocaleString()}`;
      break;
      
    case 'por_bulto':
      // Precio por bulto (para productos específicos)
      const precioPorBulto = pv.precio_bulto || 0;
      const cantBultos = cargo.packageQuantity || 1;
      const tipoProducto = pv.tipo_producto || 'bulto';
      price = cantBultos * precioPorBulto;
      breakdown.cant_bultos = cantBultos;
      breakdown.precio_bulto = precioPorBulto;
      breakdown.tarifa_especial = price;
      formula = `TARIFA ESPECIAL "${specialTariff.name}": ${cantBultos} ${tipoProducto}(s) × $${precioPorBulto.toLocaleString()} = $${price.toLocaleString()}`;
      break;
      
    case 'formula_custom':
      // Fórmula personalizada: evalúa kg * X - m3 * Y
      // Ejemplo: "kg * 96.8 - m3 * 48400"
      const formulaStr = pv.formula || '';
      const kg = cargo.weightKg || 0;
      const m3 = cargo.volumeM3 || 0;
      const minimoFormula = pv.minimo || 0; // Mínimo opcional en pricing_values
      try {
        // Parsear fórmula simple: soporta kg, m3, +, -, *, números
        const resultadoRaw = evaluarFormulaSimple(formulaStr, kg, m3);
        // Si el resultado es negativo o menor al mínimo, usar la tarifa base
        if (resultadoRaw <= 0 || (minimoFormula > 0 && resultadoRaw < minimoFormula)) {
          // Fórmula dio negativo/bajo, usar tarifa base como fallback
          price = Math.max(tarifaBase, minimoFormula);
          breakdown.peso_kg = kg;
          breakdown.volumen_m3 = m3;
          breakdown.formula_resultado = resultadoRaw;
          breakdown.tarifa_base_fallback = tarifaBase;
          formula = `TARIFA ESPECIAL "${specialTariff.name}": ${formulaStr.replace('kg', `${kg}`).replace('m3', `${m3}`)} = $${resultadoRaw.toLocaleString()} (negativo/bajo) → usando tarifa base: $${price.toLocaleString()}`;
        } else {
          price = resultadoRaw;
          breakdown.peso_kg = kg;
          breakdown.volumen_m3 = m3;
          breakdown.tarifa_especial = price;
          formula = `TARIFA ESPECIAL "${specialTariff.name}": ${formulaStr.replace('kg', `${kg}`).replace('m3', `${m3}`)} = $${price.toLocaleString()}`;
        }
      } catch (e) {
        price = tarifaBase;
        breakdown.tarifa_base = tarifaBase;
        formula = `Error en fórmula "${formulaStr}" → usando tarifa base: $${tarifaBase.toLocaleString()}`;
      }
      break;
      
    case 'descuento_porcentaje':
      const porcentaje = pv.porcentaje || 0;
      // Si hay un precio_m3 base, usarlo en lugar de la tarifa base
      const basePrecio = pv.precio_m3 ? (cargo.volumeM3 || 0) * pv.precio_m3 : tarifaBase;
      const descuento = basePrecio * (porcentaje / 100);
      price = basePrecio + descuento; // porcentaje es negativo para descuento
      breakdown.tarifa_base = basePrecio;
      breakdown.descuento_porcentaje = porcentaje;
      breakdown.descuento_monto = descuento;
      breakdown.tarifa_especial = price;
      if (pv.precio_m3) {
        formula = `TARIFA ESPECIAL "${specialTariff.name}": ${cargo.volumeM3 || 0}m³ × $${pv.precio_m3.toLocaleString()} = $${basePrecio.toLocaleString()} ${porcentaje}% = $${price.toLocaleString()}`;
      } else {
        formula = `TARIFA ESPECIAL "${specialTariff.name}": $${basePrecio.toLocaleString()} ${porcentaje}% = $${price.toLocaleString()}`;
      }
      break;
      
    case 'descuento_monto':
      const montoDescuento = pv.monto || 0;
      price = tarifaBase + montoDescuento; // monto es negativo para descuento
      breakdown.tarifa_base = tarifaBase;
      breakdown.descuento_monto = montoDescuento;
      breakdown.tarifa_especial = price;
      formula = `TARIFA ESPECIAL "${specialTariff.name}": $${tarifaBase.toLocaleString()} ${montoDescuento > 0 ? '+' : ''}$${montoDescuento.toLocaleString()} = $${price.toLocaleString()}`;
      break;
      
    default:
      price = tarifaBase;
      breakdown.tarifa_base = tarifaBase;
      formula = `Tarifa base: $${tarifaBase.toLocaleString()}`;
  }
  
  // Agregar seguro solo si la tasa es mayor a 0
  let seguro = 0;
  if (cargo.declaredValue && insuranceRate > 0) {
    seguro = cargo.declaredValue * insuranceRate;
    breakdown.seguro = seguro;
    price += seguro;
    formula += ` + $${seguro.toLocaleString()} (seguro ${(insuranceRate * 1000).toFixed(0)}‰) = $${price.toLocaleString()}`;
  } else if (insuranceRate === 0) {
    formula += ` (sin seguro)`;
  }
  
  return { price, breakdown, formula };
}

// Evaluar fórmula simple con kg y m3
function evaluarFormulaSimple(formula: string, kg: number, m3: number): number {
  // Reemplazar variables
  const expr = formula
    .toLowerCase()
    .replace(/kg/g, String(kg))
    .replace(/m3/g, String(m3))
    .replace(/\s/g, '');
  
  // Solo permitir números, operadores básicos y paréntesis por seguridad
  if (!/^[\d\.\+\-\*\/\(\)]+$/.test(expr)) {
    throw new Error('Fórmula inválida');
  }
  
  // Evaluar de forma segura usando Function
  // eslint-disable-next-line no-new-func
  const result = new Function(`return ${expr}`)();
  return Math.max(0, result); // No permitir precios negativos
}

// Buscar cotización pendiente
async function findPendingQuotation(cuit?: string, name?: string, destination?: string) {
  if (cuit) {
    const { data } = await mercure()
      .from('quotations')
      .select('*')
      .eq('customer_cuit', cuit)
      .eq('status', 'pending')
      .gte('valid_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) return data;
  }

  if (name && destination) {
    const destinationsToTry = normalizeCity(destination);
    
    for (const dest of destinationsToTry) {
      const { data } = await mercure()
        .from('quotations')
        .select('*')
        .ilike('customer_name', `%${name}%`)
        .ilike('destination', `%${dest}%`)
        .eq('status', 'pending')
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) return data;
    }
  }

  return null;
}

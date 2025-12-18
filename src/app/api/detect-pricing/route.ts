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
    'jujuy': ['San Salvador de Jujuy', 'Jujuy'],
    'san salvador de jujuy': ['San Salvador de Jujuy', 'Jujuy'],
    'buenos aires': ['Buenos Aires', 'BUENOS AIRES', 'Bs As', 'CABA'],
    'cordoba': ['Córdoba', 'Cordoba', 'CORDOBA'],
    'córdoba': ['Córdoba', 'Cordoba', 'CORDOBA'],
    'rosario': ['Rosario', 'ROSARIO'],
    'salta': ['Salta', 'SALTA'],
    'tucuman': ['Tucumán', 'Tucuman', 'TUCUMAN'],
    'tucumán': ['Tucumán', 'Tucuman', 'TUCUMAN'],
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
  decision: {
    pesoReal: number;
    pesoVolumetrico: number;
    factorConversion: number;
    pesoACobrar: number;
    criterioUsado: 'PESO_REAL' | 'PESO_VOLUMETRICO' | 'VOLUMEN_DIRECTO';
    explicacion: string;
  };
  tarifa: {
    encontrada: boolean;
    id?: number;
    origen?: string;
    destino?: string;
    rangoKg?: string;
    precioLista?: number;
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

// Factor de conversión M³ a Kg (peso volumétrico)
// 1 m³ = 300 kg (estándar en transporte terrestre)
const VOLUMETRIC_FACTOR = 300;
const DEFAULT_INSURANCE_RATE = 0.008; // 8 por mil

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
        .select('id, legal_name, tax_id, client_type, payment_terms, assigned_tariff_id')
        .eq('id', clientId)
        .single();
      client = data;
    }
    
    if (!client && recipientCuit) {
      const { data } = await mercure()
        .from('entities')
        .select('id, legal_name, tax_id, client_type, payment_terms, assigned_tariff_id')
        .eq('tax_id', recipientCuit)
        .single();
      client = data;
    }
    
    if (!client && recipientName) {
      const { data } = await mercure()
        .from('entities')
        .select('id, legal_name, tax_id, client_type, payment_terms, assigned_tariff_id')
        .ilike('legal_name', `%${recipientName}%`)
        .limit(1)
        .single();
      client = data;
    }

    // Verificar términos comerciales
    let hasCommercialTerms = false;
    if (client) {
      const { data: terms } = await mercure()
        .from('client_commercial_terms')
        .select('id')
        .eq('entity_id', client.id)
        .single();
      hasCommercialTerms = !!terms;
    }

    // Input común para debug
    const debugInput = {
      weightKg: actualWeightKg,
      volumeM3: actualVolumeM3,
      declaredValue: actualDeclaredValue,
      origin: actualOrigin,
      destination: actualDestination,
    };

    // CAMINO A: Cliente Cuenta Corriente o con términos comerciales
    if (client && (client.client_type === 'regular' || client.payment_terms === 'cuenta_corriente' || hasCommercialTerms)) {
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

// Buscar tarifa por origen, destino y peso
async function buscarTarifa(
  origin: string, 
  destination: string, 
  pesoKg: number
): Promise<{ tarifa: any | null; debug: string }> {
  
  const originsToTry = normalizeCity(origin);
  const destinationsToTry = normalizeCity(destination);
  
  // Redondear peso al múltiplo de 10 más cercano hacia arriba
  const weightBucket = Math.ceil(pesoKg / 10) * 10;
  
  console.log(`[detect-pricing] Buscando tarifa: ${originsToTry.join('/')} -> ${destinationsToTry.join('/')} para ${weightBucket}kg`);
  
  // Intentar encontrar tarifa con origen y destino
  for (const orig of originsToTry) {
    for (const dest of destinationsToTry) {
      const { data: tariff, error } = await mercure()
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
          debug: `Encontrada: ${orig} -> ${dest}, ${tariff.weight_to_kg}kg = $${tariff.price}` 
        };
      }
    }
  }
  
  // Fallback: buscar cualquier tarifa que cubra el peso (sin filtrar origen/destino)
  console.log(`[detect-pricing] No hay tarifa específica para ${origin}->${destination}, buscando genérica...`);
  
  const { data: fallbackTariff } = await mercure()
    .from('tariffs')
    .select('*')
    .neq('tariff_type', 'volume')
    .gte('weight_to_kg', weightBucket)
    .order('weight_to_kg', { ascending: true })
    .limit(1)
    .single();
  
  if (fallbackTariff) {
    return { 
      tarifa: fallbackTariff, 
      debug: `FALLBACK (sin match origen/destino): ${fallbackTariff.origin} -> ${fallbackTariff.destination}, ${fallbackTariff.weight_to_kg}kg = $${fallbackTariff.price}` 
    };
  }
  
  return { tarifa: null, debug: `NO ENCONTRADA para ${weightBucket}kg` };
}

// Calcular peso a cobrar
function calcularPesoACobrar(cargo: { weightKg?: number; volumeM3?: number }): {
  pesoReal: number;
  pesoVolumetrico: number;
  pesoACobrar: number;
  usaVolumen: boolean;
  explicacion: string;
} {
  const pesoReal = cargo.weightKg || 0;
  const pesoVolumetrico = cargo.volumeM3 ? cargo.volumeM3 * VOLUMETRIC_FACTOR : 0;
  const pesoACobrar = Math.max(pesoReal, pesoVolumetrico);
  const usaVolumen = pesoVolumetrico > pesoReal;
  
  let explicacion = '';
  if (pesoReal > 0 && pesoVolumetrico > 0) {
    explicacion = usaVolumen 
      ? `Volumen (${cargo.volumeM3}m³ × ${VOLUMETRIC_FACTOR} = ${pesoVolumetrico}kg) > Peso real (${pesoReal}kg) → Cobro por VOLUMÉTRICO`
      : `Peso real (${pesoReal}kg) ≥ Volumen (${cargo.volumeM3}m³ × ${VOLUMETRIC_FACTOR} = ${pesoVolumetrico}kg) → Cobro por PESO REAL`;
  } else if (pesoReal > 0) {
    explicacion = `Solo hay peso real (${pesoReal}kg), sin volumen → Cobro por PESO REAL`;
  } else if (pesoVolumetrico > 0) {
    explicacion = `Solo hay volumen (${cargo.volumeM3}m³ × ${VOLUMETRIC_FACTOR} = ${pesoVolumetrico}kg), sin peso → Cobro por VOLUMÉTRICO`;
  } else {
    explicacion = `No hay peso ni volumen → No se puede calcular`;
  }
  
  return { pesoReal, pesoVolumetrico, pesoACobrar, usaVolumen, explicacion };
}

// CAMINO A: Cliente Cuenta Corriente
async function handlePathA(
  client: any, 
  cargo: { packageQuantity?: number; weightKg?: number; volumeM3?: number; declaredValue?: number; origin?: string; destination?: string },
  debugInput: DebugInfo['input']
): Promise<PricingResult> {
  
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

  // Calcular peso a cobrar
  const { pesoReal, pesoVolumetrico, pesoACobrar, usaVolumen, explicacion } = calcularPesoACobrar(cargo);
  
  let price: number | null = null;
  let breakdown: Record<string, number> = {};
  let specialTariffId: number | undefined = undefined;
  let debug: DebugInfo = {
    input: debugInput,
    decision: {
      pesoReal,
      pesoVolumetrico,
      factorConversion: VOLUMETRIC_FACTOR,
      pesoACobrar,
      criterioUsado: usaVolumen ? 'PESO_VOLUMETRICO' : 'PESO_REAL',
      explicacion,
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

  if (pesoACobrar > 0) {
    const { tarifa, debug: tarifaDebug } = await buscarTarifa(
      cargo.origin || 'Buenos Aires', 
      cargo.destination || 'San Salvador de Jujuy', 
      pesoACobrar
    );

    if (tarifa) {
      const basePrice = parseFloat(tarifa.price) || 0;
      
      debug.tarifa = {
        encontrada: true,
        id: tarifa.id,
        origen: tarifa.origin,
        destino: tarifa.destination,
        rangoKg: `${tarifa.weight_from_kg}-${tarifa.weight_to_kg}`,
        precioLista: basePrice,
        queryUsada: tarifaDebug,
      };

      // Si hay tarifa especial que matchea, usarla
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
        // Usar tarifa base con modificador comercial
        breakdown.flete_lista = basePrice;
        breakdown.peso_cobrado = pesoACobrar;
        breakdown.tipo_tarifa = usaVolumen ? 2 : 0;

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

        // Debug del cálculo
        debug.calculo = {
          fleteLista: basePrice,
          modificador: tariffModifier !== 0 ? tariffModifier : undefined,
          fleteConModificador,
          valorDeclarado: cargo.declaredValue || 0,
          tasaSeguro: insuranceRate,
          seguro,
          total: price,
          formula: tariffModifier !== 0 
            ? `$${basePrice.toLocaleString()} (flete) ${tariffModifier > 0 ? '+' : ''}${tariffModifier}% = $${fleteConModificador.toLocaleString()} + $${seguro.toLocaleString()} (seguro ${(insuranceRate * 100).toFixed(1)}‰) = $${price.toLocaleString()}`
            : `$${basePrice.toLocaleString()} (flete) + $${seguro.toLocaleString()} (seguro ${(insuranceRate * 1000).toFixed(0)}‰) = $${price.toLocaleString()}`,
        };
      }
    } else {
      debug.tarifa.queryUsada = tarifaDebug;
    }
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
async function handlePathC(
  client: any | null,
  recipientName: string,
  cargo: { packageQuantity?: number; weightKg?: number; volumeM3?: number; declaredValue?: number; origin?: string; destination?: string },
  debugInput: DebugInfo['input']
): Promise<PricingResult> {
  
  const insuranceRate = DEFAULT_INSURANCE_RATE;
  
  // Calcular peso a cobrar
  const { pesoReal, pesoVolumetrico, pesoACobrar, usaVolumen, explicacion } = calcularPesoACobrar(cargo);
  
  let price: number | null = null;
  let breakdown: Record<string, number> | undefined = undefined;
  let tariffId: number | undefined = undefined;
  
  let debug: DebugInfo = {
    input: debugInput,
    decision: {
      pesoReal,
      pesoVolumetrico,
      factorConversion: VOLUMETRIC_FACTOR,
      pesoACobrar,
      criterioUsado: usaVolumen ? 'PESO_VOLUMETRICO' : 'PESO_REAL',
      explicacion,
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

  if (pesoACobrar > 0) {
    const { tarifa, debug: tarifaDebug } = await buscarTarifa(
      cargo.origin || 'Buenos Aires', 
      cargo.destination || 'San Salvador de Jujuy', 
      pesoACobrar
    );

    if (tarifa) {
      tariffId = tarifa.id;
      const basePrice = parseFloat(tarifa.price) || 0;
      
      debug.tarifa = {
        encontrada: true,
        id: tarifa.id,
        origen: tarifa.origin,
        destino: tarifa.destination,
        rangoKg: `${tarifa.weight_from_kg}-${tarifa.weight_to_kg}`,
        precioLista: basePrice,
        queryUsada: tarifaDebug,
      };
      
      breakdown = {
        flete_lista: basePrice,
        peso_cobrado: pesoACobrar,
        tipo_tarifa: usaVolumen ? 2 : 0,
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
        formula: `$${basePrice.toLocaleString()} (flete ${tarifa.weight_to_kg}kg) + $${seguro.toLocaleString()} (seguro ${(insuranceRate * 1000).toFixed(0)}‰) = $${price.toLocaleString()}`,
      };
    } else {
      debug.tarifa.queryUsada = tarifaDebug;
      
      // Fallback: precio por kg
      const precioPorKg = 500;
      const basePrice = pesoACobrar * precioPorKg;
      
      breakdown = {
        flete_lista: basePrice,
        peso_cobrado: pesoACobrar,
        tipo_tarifa: usaVolumen ? 2 : 0,
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
        formula: `FALLBACK: ${pesoACobrar}kg × $${precioPorKg}/kg = $${basePrice.toLocaleString()} + $${seguro.toLocaleString()} (seguro) = $${price.toLocaleString()}`,
      };
    }
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
  specialTariff: SpecialTariff,
  cargo: { weightKg?: number; volumeM3?: number; declaredValue?: number },
  tarifaBase: number,
  insuranceRate: number
): { price: number; breakdown: Record<string, number>; formula: string } {
  const pv = specialTariff.pricing_values || {};
  let price = 0;
  let breakdown: Record<string, number> = {};
  let formula = '';
  
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
      
    case 'descuento_porcentaje':
      const porcentaje = pv.porcentaje || 0;
      const descuento = tarifaBase * (porcentaje / 100);
      price = tarifaBase + descuento; // porcentaje es negativo para descuento
      breakdown.tarifa_base = tarifaBase;
      breakdown.descuento_porcentaje = porcentaje;
      breakdown.descuento_monto = descuento;
      breakdown.tarifa_especial = price;
      formula = `TARIFA ESPECIAL "${specialTariff.name}": $${tarifaBase.toLocaleString()} ${porcentaje}% = $${price.toLocaleString()}`;
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
  
  // Agregar seguro
  let seguro = 0;
  if (cargo.declaredValue && insuranceRate > 0) {
    seguro = cargo.declaredValue * insuranceRate;
    breakdown.seguro = seguro;
    price += seguro;
    formula += ` + $${seguro.toLocaleString()} (seguro) = $${price.toLocaleString()}`;
  }
  
  return { price, breakdown, formula };
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

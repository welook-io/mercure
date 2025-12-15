import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tipos de camino de pricing
type PricingPath = 'A' | 'B' | 'C';

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
    type: string; // regular, occasional
  };
  pricing: {
    source: string; // contract, quotation, general
    price: number | null;
    breakdown?: Record<string, number>;
    quotationId?: number;
    tariffId?: number;
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      clientId,        // ID directo del cliente (nuevo)
      recipientCuit, 
      recipientName,
      destination,
      packageQuantity,
      weightKg,
      volumeM3,
      declaredValue,
      cargo            // Objeto alternativo con weightKg, volumeM3, declaredValue
    } = body;

    // Normalizar datos de carga (soportar ambos formatos)
    const actualWeightKg = cargo?.weightKg ?? weightKg;
    const actualVolumeM3 = cargo?.volumeM3 ?? volumeM3;
    const actualDeclaredValue = cargo?.declaredValue ?? declaredValue;

    // PASO 1: Buscar cliente por ID, CUIT o nombre
    let client = null;
    
    // Primero intentar por ID si viene
    if (clientId) {
      const { data } = await supabase
        .from('mercure_entities')
        .select('id, legal_name, tax_id, client_type, payment_terms, assigned_tariff_id')
        .eq('id', clientId)
        .single();
      client = data;
    }
    
    // Si no, buscar por CUIT
    if (!client && recipientCuit) {
      const { data } = await supabase
        .from('mercure_entities')
        .select('id, legal_name, tax_id, client_type, payment_terms, assigned_tariff_id')
        .eq('tax_id', recipientCuit)
        .single();
      client = data;
    }
    
    // Si no, buscar por nombre
    if (!client && recipientName) {
      const { data } = await supabase
        .from('mercure_entities')
        .select('id, legal_name, tax_id, client_type, payment_terms, assigned_tariff_id')
        .ilike('legal_name', `%${recipientName}%`)
        .limit(1)
        .single();
      client = data;
    }

    // CAMINO A: Cliente Cuenta Corriente o con términos comerciales
    // También verificar si tiene términos comerciales configurados
    let hasCommercialTerms = false;
    if (client) {
      const { data: terms } = await supabase
        .from('mercure_client_commercial_terms')
        .select('id')
        .eq('entity_id', client.id)
        .single();
      hasCommercialTerms = !!terms;
    }

    if (client && (client.client_type === 'regular' || client.payment_terms === 'cuenta_corriente' || hasCommercialTerms)) {
      const result = await handlePathA(client, { packageQuantity, weightKg: actualWeightKg, volumeM3: actualVolumeM3, declaredValue: actualDeclaredValue });
      return NextResponse.json(result);
    }

    // PASO 2: Buscar cotización pendiente
    const quotation = await findPendingQuotation(recipientCuit, recipientName, destination);

    // CAMINO B: Tiene cotización del bot
    if (quotation) {
      const result = await handlePathB(client, quotation, { packageQuantity, weightKg: actualWeightKg });
      return NextResponse.json(result);
    }

    // CAMINO C: Doña Rosa - Tarifa general
    const result = await handlePathC(client, recipientName, { packageQuantity, weightKg: actualWeightKg, volumeM3: actualVolumeM3, declaredValue: actualDeclaredValue });
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error detecting pricing:', error);
    return NextResponse.json(
      { error: 'Error al detectar pricing' },
      { status: 500 }
    );
  }
}

// Factor de conversión M³ a Kg (peso volumétrico)
// 1 m³ = 300 kg (estándar en transporte terrestre)
const VOLUMETRIC_FACTOR = 300;

// Helper: Calcular peso a cobrar (el mayor entre real y volumétrico)
function calcularPesoACobrar(cargo: { weightKg?: number; volumeM3?: number }): {
  pesoReal: number;
  pesoVolumetrico: number;
  pesoACobrar: number;
  usaVolumen: boolean;
} {
  const pesoReal = cargo.weightKg || 0;
  const pesoVolumetrico = cargo.volumeM3 ? cargo.volumeM3 * VOLUMETRIC_FACTOR : 0;
  const pesoACobrar = Math.max(pesoReal, pesoVolumetrico);
  const usaVolumen = pesoVolumetrico > pesoReal;
  
  console.log('[detect-pricing] Cálculo de peso:', {
    pesoReal,
    pesoVolumetrico,
    pesoACobrar,
    usaVolumen: usaVolumen ? 'VOLUMEN' : 'PESO REAL'
  });
  
  return { pesoReal, pesoVolumetrico, pesoACobrar, usaVolumen };
}

// CAMINO A: Cliente Cuenta Corriente
async function handlePathA(
  client: any, 
  cargo: { packageQuantity?: number; weightKg?: number; volumeM3?: number; declaredValue?: number }
): Promise<PricingResult> {
  
  let price: number | null = null;
  let breakdown: Record<string, number> = {};
  
  // Buscar términos comerciales del cliente
  const { data: terms } = await supabase
    .from('mercure_client_commercial_terms')
    .select('*')
    .eq('entity_id', client.id)
    .eq('is_active', true)
    .single();

  const tariffType = terms?.tariff_type || 'base';
  const tariffModifier = parseFloat(terms?.tariff_modifier || '0'); // -20, -10, 0, +10, etc.
  const insuranceRate = parseFloat(terms?.insurance_rate || '0.008'); // 8 por mil

  // Calcular peso a cobrar: el MAYOR entre peso real y peso volumétrico
  const { pesoReal, pesoVolumetrico, pesoACobrar, usaVolumen } = calcularPesoACobrar(cargo);

  if (pesoACobrar > 0) {
    // Buscar tarifa por peso (redondear al múltiplo de 10 más cercano hacia arriba)
    const weightBucket = Math.ceil(pesoACobrar / 10) * 10;
    
    console.log('Buscando tarifa para peso:', weightBucket, 'kg');
    
    // Buscar tarifa que cubra ese peso (cualquier destino si no hay específica)
    const { data: tariff, error: tariffError } = await supabase
      .from('mercure_tariffs')
      .select('*')
      .gte('weight_to_kg', weightBucket)
      .order('weight_to_kg', { ascending: true })
      .limit(1)
      .single();

    console.log('Tarifa encontrada:', tariff, 'Error:', tariffError);

    if (tariff) {
      const basePrice = parseFloat(tariff.price) || 0;
      breakdown.flete_lista = basePrice;
      breakdown.peso_cobrado = pesoACobrar;

      // Aplicar modificador (descuento/recargo)
      let fleteConModificador = basePrice;
      if (tariffModifier !== 0) {
        const modificadorMonto = basePrice * (tariffModifier / 100);
        breakdown.descuento = modificadorMonto; // Será negativo si es descuento
        fleteConModificador = basePrice + modificadorMonto;
      }
      breakdown.flete_final = fleteConModificador;

      // Calcular seguro sobre valor declarado
      if (cargo.declaredValue && insuranceRate > 0) {
        breakdown.seguro = cargo.declaredValue * insuranceRate;
      }

      // Total = flete final + seguro
      price = fleteConModificador + (breakdown.seguro || 0);
      
      console.log('[detect-pricing] Path A - Precio calculado:', {
        cliente: client.legal_name,
        pesoReal,
        pesoVolumetrico,
        pesoACobrar,
        usaPeso: usaVolumen ? 'VOLUMETRICO' : 'REAL',
        weightBucket,
        tarifaEncontrada: tariff.weight_to_kg,
        precioLista: basePrice,
        modificador: tariffModifier,
        precioFinal: price
      });
    } else {
      // No hay tarifa en la tabla, usar precio por kg por defecto
      console.log('No se encontró tarifa, usando precio por defecto');
      const precioPorKg = 500; // $500 por kg como fallback
      const basePrice = pesoACobrar * precioPorKg;
      breakdown.flete_lista = basePrice;
      
      if (tariffModifier !== 0) {
        const modificadorMonto = basePrice * (tariffModifier / 100);
        breakdown.descuento = modificadorMonto;
      }
      breakdown.flete_final = basePrice + (breakdown.descuento || 0);
      
      if (cargo.declaredValue && insuranceRate > 0) {
        breakdown.seguro = cargo.declaredValue * insuranceRate;
      }
      
      price = breakdown.flete_final + (breakdown.seguro || 0);
    }
  }

  return {
    path: 'A',
    pathName: 'Cuenta Corriente',
    tag: {
      color: 'green',
      label: 'CTA CTE',
      description: `Cliente con contrato - Facturar a fin de mes${tariffModifier !== 0 ? ` (${tariffModifier}%)` : ''}`
    },
    client: {
      id: client.id,
      name: client.legal_name,
      cuit: client.tax_id,
      isNew: false,
      type: 'regular'
    },
    pricing: {
      source: 'contract',
      price,
      breakdown,
      tariffId: client.assigned_tariff_id
    },
    commercialTerms: terms ? {
      tariffType: terms.tariff_type,
      tariffModifier: tariffModifier,
      insuranceRate: insuranceRate,
      creditDays: terms.credit_days
    } : undefined
  };
}

// CAMINO B: Cotización del Bot
async function handlePathB(
  client: any | null,
  quotation: any,
  cargo: { packageQuantity?: number; weightKg?: number }
): Promise<PricingResult> {
  
  // Validar tolerancia
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
  cargo: { packageQuantity?: number; weightKg?: number; volumeM3?: number; declaredValue?: number }
): Promise<PricingResult> {
  
  // Buscar tarifa general (la más cara)
  const { data: generalTariff } = await supabase
    .from('mercure_tariffs')
    .select('*')
    .eq('tariff_type', 'standard')
    .order('price', { ascending: false })
    .limit(1)
    .single();

  let price = null;
  let breakdown: Record<string, number> | undefined = undefined;

  // Calcular peso a cobrar: el MAYOR entre peso real y peso volumétrico
  const { pesoACobrar, usaVolumen } = calcularPesoACobrar(cargo);

  if (generalTariff && pesoACobrar > 0) {
    const basePorPeso = (generalTariff.price_per_kg || 500) * pesoACobrar;
    const minimo = generalTariff.price || 5000;
    price = Math.max(basePorPeso, minimo);
    
    breakdown = {
      base: minimo,
      porPeso: basePorPeso,
      aplicado: price,
      peso_cobrado: pesoACobrar
    };
    
    console.log('[detect-pricing] Path C - Tarifa general:', {
      pesoACobrar,
      usaVolumen: usaVolumen ? 'VOLUMEN' : 'PESO REAL',
      basePorPeso,
      minimo,
      precioFinal: price
    });
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
      tariffId: generalTariff?.id
    },
    validation: {
      needsReview: true,
      reason: 'Sin cotización previa - Confirmar precio con cliente'
    }
  };
}

// Buscar cotización pendiente
async function findPendingQuotation(cuit?: string, name?: string, destination?: string) {
  // Buscar por CUIT primero
  if (cuit) {
    const { data } = await supabase
      .from('mercure_quotations')
      .select('*')
      .eq('customer_cuit', cuit)
      .eq('status', 'pending')
      .gte('valid_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) return data;
  }

  // Buscar por nombre + destino
  if (name && destination) {
    const { data } = await supabase
      .from('mercure_quotations')
      .select('*')
      .ilike('customer_name', `%${name}%`)
      .ilike('destination', `%${destination}%`)
      .eq('status', 'pending')
      .gte('valid_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) return data;
  }

  return null;
}



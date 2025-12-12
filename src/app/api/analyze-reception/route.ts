import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_CLAUDE_MERCURE_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const remitoImage = formData.get('remito') as File | null;
    const cargaImage = formData.get('carga') as File | null;

    if (!remitoImage && !cargaImage) {
      return new Response(
        JSON.stringify({ error: 'Se requiere al menos una imagen' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener lista de clientes para contexto del LLM
    const { data: clients } = await supabaseAdmin
      .from('mercure_entities')
      .select('id, legal_name, tax_id')
      .eq('entity_type', 'cliente')
      .order('legal_name');
    
    const clientList = clients?.map(c => 
      `- ID:${c.id} | ${c.legal_name}${c.tax_id ? ` | CUIT:${c.tax_id}` : ''}`
    ).join('\n') || '';

    console.log(`[analyze-reception] Clientes cargados: ${clients?.length || 0}`);

    const imageContents: Anthropic.Messages.ImageBlockParam[] = [];

    // Convertir imágenes a base64
    if (remitoImage) {
      const remitoBuffer = await remitoImage.arrayBuffer();
      const remitoBase64 = Buffer.from(remitoBuffer).toString('base64');
      const remitoMediaType = remitoImage.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      
      imageContents.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: remitoMediaType,
          data: remitoBase64,
        },
      });
      console.log(`[analyze-reception] Remito: ${remitoImage.name} (${remitoMediaType})`);
    }

    if (cargaImage) {
      const cargaBuffer = await cargaImage.arrayBuffer();
      const cargaBase64 = Buffer.from(cargaBuffer).toString('base64');
      const cargaMediaType = cargaImage.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      
      imageContents.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: cargaMediaType,
          data: cargaBase64,
        },
      });
      console.log(`[analyze-reception] Carga: ${cargaImage.name} (${cargaMediaType})`);
    }

    const prompt = `Sos un sistema de OCR especializado en documentos de logística argentina (remitos, facturas, guías de despacho).

${remitoImage ? 'IMAGEN 1: REMITO/FACTURA' : ''}
${cargaImage ? `IMAGEN ${remitoImage ? '2' : '1'}: FOTO DE LA CARGA FÍSICA` : ''}

🔍 CLIENTES REGISTRADOS EN EL SISTEMA:
${clientList || '(Sin clientes registrados)'}

EXTRAE ESTOS DATOS ESPECÍFICOS:

📄 DEL DOCUMENTO:
- NÚMERO DE REMITO: Buscar formato "0000-00000000" o similar. Puede decir "Remito N°", "Comprobante N°", "R-", etc.
- FECHA: La fecha de emisión del documento.

📦 DATOS DE LA CARGA (CRÍTICOS - buscar con mucha atención):
- CANTIDAD DE BULTOS: 
  * Buscar campo "Bultos", "Cant. Bultos", "Paquetes", "Unidades"
  * Si no hay campo específico, CONTAR las líneas del detalle (cada fila = 1 bulto)
  * Puede estar escrito a mano
- PESO TOTAL (KG):
  * Buscar campo "Peso", "Peso Total", "Kg", "Kilos"
  * Puede estar al final del documento o escrito a mano
  * Si hay pesos por línea, SUMARLOS
- VOLUMEN (M³):
  * Buscar campo "M3", "Metros cúbicos", "Volumen", "CBM" en el remito
  * Si NO está en el remito, ESTIMÁ basándote en la foto de la carga:
    - Mirá los bultos/cajas y estimá largo x ancho x alto promedio
    - Multiplicá por la cantidad de bultos
    - Devolvé el valor estimado en volumeM3
    - Marcá volumeM3Estimated: true si es una estimación
  * Ejemplos de estimación:
    - 5 cajas de 40x40x40cm = 5 * 0.064 = 0.32 m³
    - 10 bolsas grandes = aprox 0.5 m³
    - 1 pallet standard = aprox 1.2 m³
- VALOR DECLARADO ($):
  * Buscar "Total", "Importe", "Valor Mercadería", "Monto"
  * Generalmente al final del documento
  * Puede estar escrito a mano
  * Es el valor en PESOS ARGENTINOS

📝 DESCRIPCIÓN DE LA CARGA (ser MUY detallado):
  * Combinar lo que dice el REMITO + lo que VES en la FOTO
  * Del remito: productos, marcas, modelos, códigos, cantidades por item
  * De la foto: tipo de embalaje (cajas, bolsas, pallets), colores, tamaños, estado visible
  * Ejemplo: "3 cajas de cartón marrón medianas con logo Arcor, 2 bolsas plásticas negras grandes, 1 caja blanca pequeña. Según remito: galletitas surtidas, alfajores, caramelos."
  * Si hay productos específicos listados, incluirlos todos
  * Mencionar si hay fragilidad visible, etiquetas especiales, daños aparentes

👤 REMITENTE (quien ENVÍA - tiene el logo/membrete):
- Razón Social, CUIT, Dirección, Teléfono, Email
- IMPORTANTE: Si el nombre coincide con un cliente registrado, usá ESE NOMBRE EXACTO y devolvé su ID

👥 DESTINATARIO (quien RECIBE - campo "Señor/es", "Cliente", "Destino"):
- Razón Social, CUIT, Dirección completa con localidad, Teléfono, Email
- IMPORTANTE: Si el nombre coincide con un cliente registrado (aunque tenga variaciones como "SRL", "S.R.L.", "SA", etc.), usá EL NOMBRE EXACTO DEL CLIENTE REGISTRADO y devolvé su ID

Responde SOLO con este JSON (sin markdown, sin explicaciones):

{
  "deliveryNoteNumber": "número completo del remito",
  "date": "YYYY-MM-DD",
  "packageQuantity": número_entero_de_bultos,
  "weightKg": peso_total_en_kg,
  "volumeM3": volumen_en_metros_cubicos,
  "declaredValue": valor_en_pesos_sin_simbolo,
  "needsReview": {
    "packageQuantity": true/false,
    "weightKg": true/false,
    "volumeM3": true/false,
    "declaredValue": true/false,
    "recipientName": true/false,
    "recipientAddress": true/false
  },
  "reviewReasons": {
    "volumeM3": "Estimado de la foto, no figura en remito",
    "weightKg": "Valor borroso, verificar"
  },
  "senderId": ID_del_cliente_si_existe_o_null,
  "senderName": "razón social remitente",
  "senderCuit": "XX-XXXXXXXX-X",
  "senderAddress": "dirección remitente",
  "senderPhone": "teléfono",
  "senderEmail": "email",
  "recipientId": ID_del_cliente_si_existe_o_null,
  "recipientName": "razón social destinatario",
  "recipientCuit": "XX-XXXXXXXX-X",
  "recipientAddress": "dirección destinatario",
  "recipientLocality": "localidad/provincia",
  "recipientPhone": "teléfono",
  "recipientEmail": "email",
  "loadDescription": "descripción DETALLADA combinando remito + foto (productos, embalajes, estado, marcas)",
  "observations": "observaciones relevantes"
}

IMPORTANTE: 
- Si no encontrás un dato, poné null. 
- Los campos packageQuantity, weightKg, volumeM3, declaredValue, senderId, recipientId son NÚMEROS, no strings.
- CRÍTICO: Si el remitente o destinatario coincide con un cliente registrado (aunque tenga variaciones como "SRL", "S.R.L."), devolvé su ID en senderId/recipientId y usá el nombre EXACTO del registro.

CERTEZA Y REVISIÓN:
- En "needsReview", marcá TRUE los campos donde:
  * El valor es ESTIMADO (no está explícito en el documento)
  * El texto está borroso o ilegible
  * Hay ambigüedad (múltiples valores posibles)
  * Tuviste que interpretar o calcular
- En "reviewReasons", explicá brevemente POR QUÉ necesita revisión
- Ejemplos:
  * volumeM3 estimado de foto → needsReview.volumeM3: true, reviewReasons.volumeM3: "Estimado de la foto"
  * peso escrito a mano ilegible → needsReview.weightKg: true, reviewReasons.weightKg: "Escritura manual borrosa"
  * bultos contados de líneas → needsReview.packageQuantity: true, reviewReasons.packageQuantity: "Contado de líneas del detalle"`;

    console.log('[analyze-reception] Iniciando llamada a Claude con extended thinking...');

    // Crear stream con extended thinking
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let responseText = '';
        let thinkingStarted = false;

        try {
          const stream = anthropic.messages.stream({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 16000,
            thinking: {
              type: 'enabled',
              budget_tokens: 10000,
            },
            messages: [
              {
                role: 'user',
                content: [
                  ...imageContents,
                  {
                    type: 'text',
                    text: prompt,
                  },
                ],
              },
            ],
          });

          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta;
              
              // Thinking delta
              if (delta.type === 'thinking_delta') {
                if (!thinkingStarted) {
                  console.log('[analyze-reception] Thinking iniciado');
                  thinkingStarted = true;
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', text: delta.thinking })}\n\n`));
              }
              
              // Text delta (respuesta final)
              if (delta.type === 'text_delta') {
                responseText += delta.text;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: delta.text })}\n\n`));
              }
            }
          }

          console.log('[analyze-reception] Stream completado, parseando respuesta...');
          console.log('[analyze-reception] Response text length:', responseText.length);

          if (!responseText) {
            throw new Error('No se recibió texto de respuesta del modelo');
          }

          // Parsear el JSON final
          let analysisResult;
          try {
            analysisResult = JSON.parse(responseText);
          } catch {
            console.log('[analyze-reception] Parse directo falló, buscando JSON en texto...');
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysisResult = JSON.parse(jsonMatch[0]);
            } else {
              console.error('[analyze-reception] No se encontró JSON válido en:', responseText.substring(0, 500));
              throw new Error('No se pudo parsear la respuesta como JSON');
            }
          }

          console.log('[analyze-reception] Análisis completado exitosamente');

          // Enviar resultado final
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', data: analysisResult })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('[analyze-reception] Error en stream:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[analyze-reception] Error general:', error);
    return new Response(
      JSON.stringify({ error: 'Error al analizar las imágenes', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}



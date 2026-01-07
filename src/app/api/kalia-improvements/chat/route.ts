import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { auth, currentUser } from "@clerk/nextjs/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_CLAUDE_MERCURE_KEY,
});

// Helper para el schema kalia_improvements
const ki = () => supabaseAdmin!.schema("kalia_improvements");

// System prompt para el agente de feedback
const SYSTEM_PROMPT = `Sos un asistente de soporte de Kalia. Tu trabajo es tomar reportes de bugs, errores o sugerencias de mejora de usuarios.

REGLAS IMPORTANTES:
1. Sé BREVE. Máximo 1-2 oraciones por respuesta.
2. Hacé UNA sola pregunta clarificadora si es necesario. No bombardees con preguntas.
3. Si el usuario ya describió el problema de forma clara, creá el ticket INMEDIATAMENTE.
4. Si el contexto de la página ya te da info útil (ej: está en /facturas), usala.
5. No pidas detalles obvios ni info que ya tenés por el contexto.

Cuando crear el ticket:
- Si el usuario describe un problema concreto → creá el ticket
- Si falta info crítica (ej: "no anda" sin decir qué) → hacé UNA pregunta
- Después de una respuesta del usuario → creá el ticket

Tono: español rioplatense, informal pero profesional. Nada de "¡Hola!" ni formalidades excesivas.

Contexto de la página actual:
{{PAGE_CONTEXT}}`;

// Tool definition para submit_ticket
const SUBMIT_TICKET_TOOL: Anthropic.Tool = {
  name: "submit_ticket",
  description:
    "Crea un ticket de feedback. Usalo rápido apenas tengas una descripción razonable del problema. No esperes a tener todos los detalles perfectos.",
  input_schema: {
    type: "object",
    properties: {
      ticket_type: {
        type: "string",
        enum: [
          "bug",
          "error",
          "improvement",
          "feature_request",
          "missing_functionality",
          "question",
          "other",
        ],
        description: "Tipo de ticket basado en lo que reportó el usuario",
      },
      severity: {
        type: "string",
        enum: ["low", "medium", "high", "critical"],
        description:
          "Severidad del problema. critical: bloquea trabajo, high: impacta significativamente, medium: inconveniente, low: menor",
      },
      title: {
        type: "string",
        description:
          "Título conciso del ticket (máximo 100 caracteres)",
      },
      description: {
        type: "string",
        description: "Descripción detallada del problema o sugerencia",
      },
      steps_to_reproduce: {
        type: "string",
        description:
          "Pasos para reproducir el bug (solo para bugs/errores)",
      },
      expected_behavior: {
        type: "string",
        description: "Qué esperaba el usuario que pasara",
      },
      actual_behavior: {
        type: "string",
        description: "Qué pasó en realidad",
      },
      affected_module: {
        type: "string",
        description:
          "Módulo o área del sistema afectada (ej: facturas, envíos, recepción)",
      },
      ai_summary: {
        type: "string",
        description:
          "Resumen ejecutivo de 1-2 oraciones para el equipo de desarrollo",
      },
    },
    required: ["ticket_type", "title", "description", "ai_summary"],
  },
};

interface PageContext {
  url?: string;
  title?: string;
  module?: string;
  additionalInfo?: string;
}

interface ChatRequestBody {
  conversation_id?: string;
  message: string;
  page_context?: PageContext;
}

export async function POST(req: NextRequest) {
  try {
    // Autenticación
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener datos del usuario desde Clerk directamente
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;
    const userName = user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : userEmail?.split("@")[0];

    // Parsear body
    const body: ChatRequestBody = await req.json();
    const { message, page_context } = body;
    let { conversation_id } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Mensaje requerido" },
        { status: 400 }
      );
    }

    // Crear o obtener conversación
    if (!conversation_id) {
      const { data: newConv, error: convError } = await ki()
        .from("conversations")
        .insert({
          clerk_user_id: clerkUserId,
          user_name: userName,
          user_email: userEmail,
          page_url: page_context?.url,
          page_title: page_context?.title,
          page_module: page_context?.module,
          page_context: page_context || {},
        })
        .select("id")
        .single();

      if (convError || !newConv) {
        console.error("Error creating conversation:", convError);
        return NextResponse.json(
          { error: "Error creando conversación" },
          { status: 500 }
        );
      }
      conversation_id = newConv.id;
    }

    // Guardar mensaje del usuario
    await ki().from("messages").insert({
      conversation_id,
      role: "user",
      content: message,
    });

    // Actualizar last_message_at
    await ki()
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    // Obtener historial de mensajes
    const { data: historyData } = await ki()
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    const messages: Anthropic.MessageParam[] = (historyData || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Preparar contexto de página para el system prompt
    let pageContextStr = "No disponible";
    if (page_context) {
      pageContextStr = `
- URL: ${page_context.url || "N/A"}
- Página: ${page_context.title || "N/A"}
- Módulo: ${page_context.module || "N/A"}
- Info adicional: ${page_context.additionalInfo || "N/A"}`;
    }

    const systemPrompt = SYSTEM_PROMPT.replace("{{PAGE_CONTEXT}}", pageContextStr);

    // Llamar a Anthropic
    const response = await anthropic.messages.create({
    model: 'claude-opus-4-5-20251101',
      max_tokens: 1024,
      system: systemPrompt,
      tools: [SUBMIT_TICKET_TOOL],
      messages,
    });

    // Procesar respuesta
    let assistantMessage = "";
    let ticketCreated = null;
    const toolCalls: unknown[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        assistantMessage += block.text;
      } else if (block.type === "tool_use" && block.name === "submit_ticket") {
        toolCalls.push(block);
        
        // Crear el ticket
        const ticketInput = block.input as {
          ticket_type: string;
          severity?: string;
          title: string;
          description: string;
          steps_to_reproduce?: string;
          expected_behavior?: string;
          actual_behavior?: string;
          affected_module?: string;
          ai_summary?: string;
        };

        const { data: ticket, error: ticketError } = await ki()
          .from("tickets")
          .insert({
            conversation_id,
            clerk_user_id: clerkUserId,
            ticket_type: ticketInput.ticket_type,
            severity: ticketInput.severity || "medium",
            title: ticketInput.title,
            description: ticketInput.description,
            steps_to_reproduce: ticketInput.steps_to_reproduce,
            expected_behavior: ticketInput.expected_behavior,
            actual_behavior: ticketInput.actual_behavior,
            affected_module: ticketInput.affected_module || page_context?.module,
            page_url: page_context?.url,
            user_name: userName,
            user_email: userEmail,
            ai_summary: ticketInput.ai_summary,
          })
          .select("id, ticket_number")
          .single();

        if (ticketError) {
          console.error("Error creating ticket:", ticketError);
        } else {
          ticketCreated = ticket;

          // Actualizar estado de conversación
          await ki()
            .from("conversations")
            .update({ status: "ticket_created" })
            .eq("id", conversation_id);
        }
      }
    }

    // Si hubo tool_use, necesitamos hacer otra llamada para obtener el mensaje final
    if (response.stop_reason === "tool_use" && ticketCreated) {
      // Agregar tool_result y obtener respuesta final
      const toolResultMessages: Anthropic.MessageParam[] = [
        ...messages,
        { role: "assistant", content: response.content },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: (response.content.find(b => b.type === "tool_use") as Anthropic.ToolUseBlock)?.id || "",
              content: JSON.stringify({
                success: true,
                ticket_number: ticketCreated.ticket_number,
                ticket_id: ticketCreated.id,
              }),
            },
          ],
        },
      ];

      const finalResponse = await anthropic.messages.create({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 1024,
        system: systemPrompt,
        tools: [SUBMIT_TICKET_TOOL],
        messages: toolResultMessages,
      });

      // Extraer texto de la respuesta final
      for (const block of finalResponse.content) {
        if (block.type === "text") {
          assistantMessage = block.text;
        }
      }
    }

    // Guardar respuesta del asistente
    if (assistantMessage) {
      await ki().from("messages").insert({
        conversation_id,
        role: "assistant",
        content: assistantMessage,
        model: 'claude-opus-4-5-20251101',
        tool_calls: toolCalls.length > 0 ? toolCalls : null,
      });
    }

    return NextResponse.json({
      conversation_id,
      message: assistantMessage,
      ticket: ticketCreated
        ? {
            id: ticketCreated.id,
            number: ticketCreated.ticket_number,
          }
        : null,
    });
  } catch (error) {
    console.error("Kalia Improvements chat error:", error);
    return NextResponse.json(
      { error: "Error procesando mensaje" },
      { status: 500 }
    );
  }
}


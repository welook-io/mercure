import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth, currentUser } from "@clerk/nextjs/server";

// Helper para el schema kalia_improvements
const ki = () => supabaseAdmin!.schema("kalia_improvements");

interface TicketRequestBody {
  ticket_type: string;
  severity?: string;
  title: string;
  description: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  affected_module?: string;
  page_url?: string;
  conversation_id?: string;
}

// POST: Crear ticket manualmente (sin pasar por el chat)
export async function POST(req: NextRequest) {
  try {
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

    const body: TicketRequestBody = await req.json();

    if (!body.title || !body.description || !body.ticket_type) {
      return NextResponse.json(
        { error: "title, description y ticket_type son requeridos" },
        { status: 400 }
      );
    }

    const { data: ticket, error } = await ki()
      .from("tickets")
      .insert({
        clerk_user_id: clerkUserId,
        conversation_id: body.conversation_id || null,
        ticket_type: body.ticket_type,
        severity: body.severity || "medium",
        title: body.title,
        description: body.description,
        steps_to_reproduce: body.steps_to_reproduce,
        expected_behavior: body.expected_behavior,
        actual_behavior: body.actual_behavior,
        affected_module: body.affected_module,
        page_url: body.page_url,
        user_name: userName,
        user_email: userEmail,
      })
      .select("id, ticket_number, created_at")
      .single();

    if (error) {
      console.error("Error creating ticket:", error);
      return NextResponse.json(
        { error: "Error creando ticket" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        number: ticket.ticket_number,
        created_at: ticket.created_at,
      },
    });
  } catch (error) {
    console.error("Ticket creation error:", error);
    return NextResponse.json(
      { error: "Error procesando solicitud" },
      { status: 500 }
    );
  }
}

// GET: Obtener tickets del usuario actual
export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    // Buscar por clerk_user_id directamente
    let query = ki()
      .from("tickets")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error("Error fetching tickets:", error);
      return NextResponse.json(
        { error: "Error obteniendo tickets" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Ticket fetch error:", error);
    return NextResponse.json(
      { error: "Error procesando solicitud" },
      { status: 500 }
    );
  }
}


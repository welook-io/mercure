import { supabaseAdmin } from "@/lib/supabase";
import { auth, currentUser } from "@clerk/nextjs/server";

// Tipos de acciones comunes
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "login"
  | "logout"
  | "approve"
  | "reject"
  | "assign"
  | "revoke";

// Módulos del sistema
export type AuditModule =
  | "configuracion"
  | "recepcion"
  | "consolidacion"
  | "envios"
  | "arribo"
  | "reparto"
  | "viajes"
  | "vehiculos"
  | "entidades"
  | "tarifas"
  | "cuentas_corrientes"
  | "facturas"
  | "cobranzas"
  | "liquidaciones"
  | "pagos"
  | "contabilidad"
  | "auth"
  | "acuerdos"
  | "cotizaciones";

// Tipos de entidades
export type AuditTargetType =
  | "user"
  | "permission"
  | "role"
  | "shipment"
  | "entity"
  | "invoice"
  | "trip"
  | "vehicle"
  | "tariff"
  | "quotation"
  | "settlement"
  | "agreement";

export interface AuditLogParams {
  action: AuditAction;
  module: AuditModule;
  description: string;
  targetType?: AuditTargetType;
  targetId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  // Opcional: pasar usuario explícitamente (útil para API routes)
  userOverride?: {
    userId?: string;
    email?: string;
    name?: string;
  };
}

/**
 * Registra una acción en los logs de auditoría
 * Se usa desde server actions o API routes
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    if (!supabaseAdmin) {
      console.warn("Audit log: supabaseAdmin not available");
      return;
    }

    let dbUserId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    // Si se pasó usuario explícitamente, usarlo
    if (params.userOverride) {
      userEmail = params.userOverride.email || null;
      userName = params.userOverride.name || null;
      if (params.userOverride.userId) {
        dbUserId = params.userOverride.userId;
      }
    } else {
      // Intentar obtener info del usuario desde Clerk
      try {
        const { userId: clerkId } = await auth();
        const user = await currentUser();

        if (clerkId) {
          userEmail = user?.emailAddresses[0]?.emailAddress || null;
          userName = user?.fullName || user?.firstName || null;

          // Buscar el user_id en nuestra tabla users
          const { data: dbUser } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

          if (dbUser) {
            dbUserId = dbUser.id;
          }
        }
      } catch {
        // Si falla auth (ej: desde API route sin contexto), continuar sin usuario
        console.warn("Audit log: Could not get user from auth context");
      }
    }

    // Si no hay usuario, marcar como sistema
    if (!userEmail) {
      userEmail = "sistema@mercure.com";
      userName = "Sistema";
    }

    // Insertar el log
    const { error } = await supabaseAdmin.schema("mercure").from("audit_logs").insert({
      user_id: dbUserId,
      user_email: userEmail,
      user_name: userName,
      action: params.action,
      module: params.module,
      description: params.description,
      target_type: params.targetType || null,
      target_id: params.targetId || null,
      old_value: params.oldValue || null,
      new_value: params.newValue || null,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error("Error saving audit log:", error);
    }
  } catch (error) {
    // No lanzar errores para no afectar la operación principal
    console.error("Error in logAudit:", error);
  }
}

/**
 * Versión simplificada para logs rápidos
 */
export async function logAction(
  module: AuditModule,
  description: string,
  action: AuditAction = "update"
): Promise<void> {
  return logAudit({
    action,
    module,
    description,
  });
}

/**
 * Log para cambios de permisos
 */
export async function logPermissionChange(
  targetUserId: string,
  targetUserEmail: string,
  permission: string,
  granted: boolean
): Promise<void> {
  return logAudit({
    action: granted ? "assign" : "revoke",
    module: "configuracion",
    description: `${granted ? "Otorgó" : "Revocó"} permiso "${permission}" a ${targetUserEmail}`,
    targetType: "permission",
    targetId: targetUserId,
    newValue: { permission, has_access: granted, target_email: targetUserEmail },
  });
}

/**
 * Log para creación de entidades
 */
export async function logEntityCreated(
  entityId: string | number,
  entityName: string,
  module: AuditModule = "entidades"
): Promise<void> {
  return logAudit({
    action: "create",
    module,
    description: `Creó entidad: ${entityName}`,
    targetType: "entity",
    targetId: String(entityId),
    newValue: { name: entityName },
  });
}

/**
 * Log para facturas
 */
export async function logInvoiceCreated(
  invoiceId: string | number,
  invoiceNumber: string,
  clientName: string,
  total: number
): Promise<void> {
  return logAudit({
    action: "create",
    module: "facturas",
    description: `Emitió factura ${invoiceNumber} a ${clientName} por $${total.toLocaleString("es-AR")}`,
    targetType: "invoice",
    targetId: String(invoiceId),
    newValue: { invoice_number: invoiceNumber, client: clientName, total },
  });
}

/**
 * Log para envíos/remitos
 */
export async function logShipmentCreated(
  shipmentId: string | number,
  deliveryNoteNumber: string | null,
  senderName: string,
  recipientName: string,
  userOverride?: { userId?: string; email?: string; name?: string }
): Promise<void> {
  return logAudit({
    action: "create",
    module: "recepcion",
    description: `Creó remito ${deliveryNoteNumber || `#${shipmentId}`}: ${senderName} → ${recipientName}`,
    targetType: "shipment",
    targetId: String(shipmentId),
    newValue: { delivery_note: deliveryNoteNumber, sender: senderName, recipient: recipientName },
    userOverride,
  });
}

/**
 * Log para cambios de estado de envíos
 */
export async function logShipmentStatusChange(
  shipmentId: string | number,
  deliveryNoteNumber: string | null,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  return logAudit({
    action: "update",
    module: "envios",
    description: `Cambió estado de remito ${deliveryNoteNumber || `#${shipmentId}`}: ${oldStatus} → ${newStatus}`,
    targetType: "shipment",
    targetId: String(shipmentId),
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
  });
}

/**
 * Log para cotizaciones
 */
export async function logQuotationCreated(
  quotationId: string,
  quotationNumber: string | null,
  customerName: string,
  total: number
): Promise<void> {
  return logAudit({
    action: "create",
    module: "cotizaciones",
    description: `Creó cotización ${quotationNumber || `#${quotationId.slice(0, 8)}`} para ${customerName} por $${total.toLocaleString("es-AR")}`,
    targetType: "quotation",
    targetId: quotationId,
    newValue: { quotation_number: quotationNumber, customer: customerName, total },
  });
}


"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isSuperAdmin, ALL_PERMISSIONS, Permission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logPermissionChange, logAudit } from "@/lib/audit-log";

// ID de la organización Mercure SRL
const MERCURE_ORG_ID = "620245b9-bac0-434b-b32e-2e07e9428751";

// Actualizar un permiso individual de un usuario
export async function updateUserPermission(
  userId: string, 
  permission: Permission, 
  hasAccess: boolean
) {
  const { userId: authUserId } = await auth();
  if (!authUserId) {
    return { error: "No autenticado" };
  }

  if (!supabaseAdmin) {
    return { error: "Configuración de servidor incompleta" };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Solo super admins pueden modificar permisos
  if (!isSuperAdmin(userEmail)) {
    return { error: "No autorizado" };
  }

  // Validar que el permiso existe
  if (!ALL_PERMISSIONS.includes(permission)) {
    return { error: "Permiso inválido" };
  }

  try {
    // Obtener email del usuario target
    const { data: targetUser } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    // Upsert del permiso
    const { error } = await supabaseAdmin
      .from("mercure_user_permissions")
      .upsert(
        {
          user_id: userId,
          permission: permission,
          has_access: hasAccess,
        },
        {
          onConflict: "user_id,permission",
        }
      );

    if (error) throw error;

    // Registrar en audit log
    await logPermissionChange(userId, targetUser?.email || userId, permission, hasAccess);

    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    console.error("Error updating permission:", e);
    return { error: "Error al actualizar permiso" };
  }
}

// Actualizar múltiples permisos de un usuario a la vez
export async function updateUserPermissions(
  userId: string,
  permissions: Record<string, boolean>
) {
  const { userId: authUserId } = await auth();
  if (!authUserId) {
    return { error: "No autenticado" };
  }

  if (!supabaseAdmin) {
    return { error: "Configuración de servidor incompleta" };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Solo super admins pueden modificar permisos
  if (!isSuperAdmin(userEmail)) {
    return { error: "No autorizado" };
  }

  try {
    // Obtener email del usuario target
    const { data: targetUser } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    // Crear array de permisos para upsert
    const permissionsToUpsert = Object.entries(permissions).map(([permission, hasAccess]) => ({
      user_id: userId,
      permission,
      has_access: hasAccess,
    }));

    // Upsert todos los permisos
    const { error } = await supabaseAdmin
      .from("mercure_user_permissions")
      .upsert(permissionsToUpsert, {
        onConflict: "user_id,permission",
      });

    if (error) throw error;

    // Registrar en audit log
    const changedPermissions = Object.entries(permissions)
      .map(([p, v]) => `${p}:${v ? "✓" : "✗"}`)
      .join(", ");
    await logAudit({
      action: "update",
      module: "configuracion",
      description: `Actualizó permisos de ${targetUser?.email || userId}: ${changedPermissions}`,
      targetType: "permission",
      targetId: userId,
      newValue: permissions,
    });

    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    console.error("Error updating permissions:", e);
    return { error: "Error al actualizar permisos" };
  }
}

// Agregar usuario a la organización (sin rol, solo membresía)
export async function addUserToOrg(userId: string) {
  const { userId: authUserId } = await auth();
  if (!authUserId) {
    return { error: "No autenticado" };
  }

  if (!supabaseAdmin) {
    return { error: "Configuración de servidor incompleta" };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Solo super admins pueden agregar usuarios
  if (!isSuperAdmin(userEmail)) {
    return { error: "No autorizado" };
  }

  try {
    // Obtener email del usuario target
    const { data: targetUser } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    // Verificar si ya existe
    const { data: existing } = await supabaseAdmin
      .from("user_organizations")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", MERCURE_ORG_ID)
      .limit(1);

    if (existing && existing.length > 0) {
      // Actualizar para asegurar que esté activo
      await supabaseAdmin
        .from("user_organizations")
        .update({ role: "member", is_active: true })
        .eq("user_id", userId)
        .eq("organization_id", MERCURE_ORG_ID);
    } else {
      // Insertar nueva membresía
      await supabaseAdmin
        .from("user_organizations")
        .insert({
          user_id: userId,
          organization_id: MERCURE_ORG_ID,
          role: "member",
          is_active: true,
        });
    }

    // Registrar en audit log
    await logAudit({
      action: "assign",
      module: "configuracion",
      description: `Agregó usuario ${targetUser?.email || userId} a la organización`,
      targetType: "user",
      targetId: userId,
    });

    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    console.error("Error adding user to org:", e);
    return { error: "Error al agregar usuario" };
  }
}

// Remover usuario de la organización (desactiva membresía y permisos)
export async function removeUserFromOrg(userId: string, targetEmail: string) {
  const { userId: authUserId } = await auth();
  if (!authUserId) {
    return { error: "No autenticado" };
  }

  if (!supabaseAdmin) {
    return { error: "Configuración de servidor incompleta" };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Solo super admins pueden remover usuarios
  if (!isSuperAdmin(userEmail)) {
    return { error: "No autorizado" };
  }

  // No permitir modificar super admins
  if (isSuperAdmin(targetEmail)) {
    return { error: "No se puede modificar a un Super Admin" };
  }

  try {
    // Desactivar membresía
    await supabaseAdmin
      .from("user_organizations")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("organization_id", MERCURE_ORG_ID);

    // Poner todos los permisos en false
    const { error } = await supabaseAdmin
      .from("mercure_user_permissions")
      .update({ has_access: false })
      .eq("user_id", userId);

    if (error) throw error;

    // Registrar en audit log
    await logAudit({
      action: "revoke",
      module: "configuracion",
      description: `Removió usuario ${targetEmail} de la organización`,
      targetType: "user",
      targetId: userId,
    });

    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    console.error("Error removing user:", e);
    return { error: "Error al remover usuario" };
  }
}

// ============================================================================
// LEGACY: Mantener para compatibilidad durante migración
// ============================================================================

export async function assignRole(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "No autenticado" };
  }

  if (!supabaseAdmin) {
    return { error: "Configuración de servidor incompleta" };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Solo super admins pueden asignar roles
  if (!isSuperAdmin(userEmail)) {
    return { error: "No autorizado" };
  }

  const targetUserId = formData.get("userId") as string;
  const targetEmail = formData.get("email") as string;
  const role = formData.get("role") as string;

  if (!targetUserId || !role) {
    return { error: "Datos incompletos" };
  }

  // No permitir cambiar rol de super admins
  if (isSuperAdmin(targetEmail)) {
    return { error: "No se puede cambiar el rol de un Super Admin" };
  }

  try {
    // 1. Asegurar que el usuario tenga membresía en la org con rol genérico "member"
    const { data: existingOrg } = await supabaseAdmin
      .from("user_organizations")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("organization_id", MERCURE_ORG_ID)
      .limit(1);

    if (existingOrg && existingOrg.length > 0) {
      // Actualizar para asegurar que esté activo
      await supabaseAdmin
        .from("user_organizations")
        .update({ role: "member", is_active: true })
        .eq("user_id", targetUserId)
        .eq("organization_id", MERCURE_ORG_ID);
    } else {
      // Insertar con rol genérico "member"
      await supabaseAdmin
        .from("user_organizations")
        .insert({ 
          user_id: targetUserId, 
          organization_id: MERCURE_ORG_ID,
          role: "member",
          is_active: true
        });
    }

    // 2. Guardar el rol específico de Mercure en user_roles
    const { data: existingRole } = await supabaseAdmin
      .from("mercure_user_roles")
      .select("id")
      .eq("user_id", targetUserId)
      .limit(1);

    if (existingRole && existingRole.length > 0) {
      // Actualizar rol existente
      const { error } = await supabaseAdmin
        .from("mercure_user_roles")
        .update({ role, is_active: true })
        .eq("user_id", targetUserId);

      if (error) throw error;
    } else {
      // Insertar nuevo rol
      const { error } = await supabaseAdmin
        .from("mercure_user_roles")
        .insert({ 
          user_id: targetUserId,
          role,
          is_active: true
        });

      if (error) throw error;
    }

    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    console.error("Error assigning role:", e);
    return { error: "Error al asignar rol" };
  }
}

export async function removeRole(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "No autenticado" };
  }

  if (!supabaseAdmin) {
    return { error: "Configuración de servidor incompleta" };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Solo super admins pueden remover roles
  if (!isSuperAdmin(userEmail)) {
    return { error: "No autorizado" };
  }

  const targetUserId = formData.get("userId") as string;
  const targetEmail = formData.get("email") as string;

  if (!targetUserId) {
    return { error: "Datos incompletos" };
  }

  // No permitir modificar super admins
  if (isSuperAdmin(targetEmail)) {
    return { error: "No se puede modificar a un Super Admin" };
  }

  try {
    // 1. Desactivar el usuario en user_organizations
    await supabaseAdmin
      .from("user_organizations")
      .update({ is_active: false })
      .eq("user_id", targetUserId)
      .eq("organization_id", MERCURE_ORG_ID);

    // 2. Desactivar el rol en user_roles
    const { error } = await supabaseAdmin
      .from("mercure_user_roles")
      .update({ is_active: false })
      .eq("user_id", targetUserId);

    if (error) throw error;

    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    console.error("Error removing role:", e);
    return { error: "Error al remover rol" };
  }
}

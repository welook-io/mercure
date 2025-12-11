"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function assignRole(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "No autenticado" };
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
    // Verificar si ya existe un registro para este usuario
    const { data: existing } = await supabase
      .from("user_organizations")
      .select("id")
      .eq("user_id", targetUserId)
      .single();

    if (existing) {
      // Actualizar rol existente
      const { error } = await supabase
        .from("user_organizations")
        .update({ role })
        .eq("user_id", targetUserId);

      if (error) throw error;
    } else {
      // Insertar nuevo registro
      const { error } = await supabase
        .from("user_organizations")
        .insert({ user_id: targetUserId, role });

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

  // No permitir cambiar rol de super admins
  if (isSuperAdmin(targetEmail)) {
    return { error: "No se puede modificar a un Super Admin" };
  }

  try {
    const { error } = await supabase
      .from("user_organizations")
      .delete()
      .eq("user_id", targetUserId);

    if (error) throw error;

    revalidatePath("/configuracion");
    return { success: true };
  } catch (e) {
    console.error("Error removing role:", e);
    return { error: "Error al remover rol" };
  }
}

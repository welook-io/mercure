import { supabase } from "./supabase";
import { isSuperAdmin } from "./permissions";

export async function getUserRole(userId: string): Promise<string | null> {
  // Buscar el perfil del usuario en mercure_profiles
  const { data, error } = await supabase
    .from('mercure_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}

export async function hasAccess(userId: string, email?: string | null): Promise<boolean> {
  // Super admins siempre tienen acceso
  if (email && isSuperAdmin(email)) {
    return true;
  }
  
  // Buscar rol en user_organizations para Mercure
  const MERCURE_ORG_ID = "620245b9-bac0-434b-b32e-2e07e9428751";
  
  // Primero obtener el ID de usuario de Supabase desde clerk_id
  const { data: userData } = await supabase
    .from("users")
    .select("id, email")
    .eq("clerk_id", userId)
    .limit(1);

  if (!userData || userData.length === 0) {
    return false;
  }

  const supabaseUserId = userData[0].id;
  const userEmail = email || userData[0].email;

  // Verificar si es super admin por email
  if (userEmail && isSuperAdmin(userEmail)) {
    return true;
  }

  // Verificar si tiene rol en la organización Mercure
  const { data: orgData } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("user_id", supabaseUserId)
    .eq("organization_id", MERCURE_ORG_ID)
    .eq("is_active", true)
    .limit(1);

  return orgData !== null && orgData.length > 0;
}

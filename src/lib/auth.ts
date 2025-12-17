import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "./supabase";
import { 
  isSuperAdmin, 
  canAccessRoute, 
  Permission, 
  hasPermission,
  UserPermissions,
  ALL_PERMISSIONS
} from "./permissions";

// Usar supabaseAdmin para bypasear RLS (solo server-side)
const supabase = supabaseAdmin!;

// Helper para queries al schema mercure
const mercure = () => supabase.schema('mercure');

// Obtener permisos del usuario desde user_permissions
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const { data, error } = await supabase
    .from('mercure_user_permissions')
    .select('permission, has_access')
    .eq('user_id', userId)
    .eq('has_access', true);

  if (error || !data) {
    return {};
  }

  const permissions: UserPermissions = {};
  data.forEach(p => {
    permissions[p.permission] = p.has_access;
  });

  return permissions;
}

export async function hasAccess(userId: string, email?: string | null): Promise<boolean> {
  // Super admins siempre tienen acceso
  if (email && isSuperAdmin(email)) {
    return true;
  }
  
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

  // Verificar si tiene al menos un permiso activo
  const { data: permData } = await supabase
    .from("mercure_user_permissions")
    .select("permission")
    .eq("user_id", supabaseUserId)
    .eq("has_access", true)
    .limit(1);

  return permData !== null && permData.length > 0;
}

// Helper para obtener los permisos del usuario actual autenticado
export async function getCurrentUserPermissions(): Promise<{ 
  permissions: UserPermissions; 
  email: string | null; 
  userId: string | null;
  supabaseUserId: string | null;
}> {
  const { userId } = await auth();
  
  if (!userId) {
    return { permissions: {}, email: null, userId: null, supabaseUserId: null };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || null;

  // Super admins tienen todos los permisos
  if (userEmail && isSuperAdmin(userEmail)) {
    const allPermissions: UserPermissions = {};
    ALL_PERMISSIONS.forEach(p => {
      allPermissions[p] = true;
    });
    return { permissions: allPermissions, email: userEmail, userId, supabaseUserId: null };
  }

  // Buscar usuario en Supabase
  const { data: userData } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .limit(1);

  if (!userData || userData.length === 0) {
    return { permissions: {}, email: userEmail, userId, supabaseUserId: null };
  }

  const supabaseUserId = userData[0].id;

  // Buscar permisos
  const permissions = await getUserPermissions(supabaseUserId);

  return { 
    permissions, 
    email: userEmail,
    userId,
    supabaseUserId
  };
}

// Helper para proteger páginas server-side
export async function requireAuth(pathname: string) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Verificar si tiene acceso base (algún permiso o super admin)
  const userHasAccess = await hasAccess(userId, userEmail);
  if (!userHasAccess) {
    redirect("/solicitar-acceso");
  }

  // Obtener permisos para verificar acceso a ruta
  const { permissions } = await getCurrentUserPermissions();

  // Verificar si puede acceder a esta ruta específica
  if (!canAccessRoute(permissions, userEmail, pathname)) {
    redirect("/");
  }

  return { userId, userEmail, permissions };
}

// Helper para verificar permiso específico en página
export async function requirePermission(permission: Permission) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  const { permissions } = await getCurrentUserPermissions();

  if (!hasPermission(permissions, userEmail, permission)) {
    redirect("/");
  }

  return { userId, userEmail, permissions };
}

// ============================================================================
// LEGACY: Mantener para compatibilidad durante migración
// ============================================================================

export async function getUserRole(userId: string): Promise<string | null> {
  // Buscar el rol del usuario en user_roles (legacy)
  const { data, error } = await supabase
    .from('mercure_user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}

export async function getCurrentUserRole(): Promise<{ role: string | null; email: string | null; userId: string | null }> {
  const { userId } = await auth();
  
  if (!userId) {
    return { role: null, email: null, userId: null };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || null;

  // Super admins tienen rol especial
  if (userEmail && isSuperAdmin(userEmail)) {
    return { role: "super_admin", email: userEmail, userId };
  }

  // Buscar usuario en Supabase
  const { data: userData } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .limit(1);

  if (!userData || userData.length === 0) {
    return { role: null, email: userEmail, userId };
  }

  // Buscar rol en user_roles (legacy)
  const { data: roleData } = await supabase
    .from("mercure_user_roles")
    .select("role")
    .eq("user_id", userData[0].id)
    .eq("is_active", true)
    .limit(1);

  return { 
    role: roleData?.[0]?.role || null, 
    email: userEmail,
    userId 
  };
}

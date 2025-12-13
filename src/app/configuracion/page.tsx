import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { supabaseAdmin } from "@/lib/supabase";
import { isSuperAdmin, SUPER_ADMIN_DOMAIN } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { ConfigTabs } from "./config-tabs";

interface UserWithPermissions {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  permissions: Record<string, boolean>;
  is_kalia: boolean;
}

interface UserBasic {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  is_kalia: boolean;
}

interface AuditLog {
  id: number;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  module: string;
  description: string;
  target_type: string | null;
  target_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Obtener usuarios con permisos asignados
async function getUsersWithPermissions(): Promise<UserWithPermissions[]> {
  if (!supabaseAdmin) {
    console.error("supabaseAdmin not configured");
    return [];
  }
  
  try {
    // Traer todos los permisos activos
    const { data: permissionsData, error: permError } = await supabaseAdmin
      .from("mercure_user_permissions")
      .select("user_id, permission, has_access")
      .eq("has_access", true);

    if (permError) {
      console.error("Error fetching permissions:", permError);
      return [];
    }

    if (!permissionsData || permissionsData.length === 0) {
      return [];
    }

    // Obtener user_ids únicos
    const userIds = [...new Set(permissionsData.map(p => p.user_id))];

    // Traer datos de usuarios
    const { data: usersData } = await supabaseAdmin
      .from("users")
      .select("id, email, name, avatar_url")
      .in("id", userIds);

    // Agrupar permisos por usuario
    const permissionsByUser: Record<string, Record<string, boolean>> = {};
    permissionsData.forEach(p => {
      if (!permissionsByUser[p.user_id]) {
        permissionsByUser[p.user_id] = {};
      }
      permissionsByUser[p.user_id][p.permission] = p.has_access;
    });

    // Construir resultado
    const users: UserWithPermissions[] = userIds.map(userId => {
      const userData = usersData?.find(u => u.id === userId);
      const email = userData?.email || "";
      return {
        id: userId,
        email: email,
        full_name: userData?.name || null,
        image_url: userData?.avatar_url || null,
        permissions: permissionsByUser[userId] || {},
        is_kalia: email.toLowerCase().endsWith(`@${SUPER_ADMIN_DOMAIN}`),
      };
    });

    // Ordenar: primero @kalia.app, luego por nombre
    return users.sort((a, b) => {
      if (a.is_kalia && !b.is_kalia) return -1;
      if (!a.is_kalia && b.is_kalia) return 1;
      return (a.full_name || a.email).localeCompare(b.full_name || b.email);
    });

  } catch (e) {
    console.error("Error in getUsersWithPermissions:", e);
    return [];
  }
}

// Obtener usuarios sin permisos (para agregar)
async function getAvailableUsers(excludeIds: string[]): Promise<UserBasic[]> {
  if (!supabaseAdmin) {
    console.error("supabaseAdmin not configured");
    return [];
  }
  
  try {
    const query = supabaseAdmin
      .from("users")
      .select("id, email, name, avatar_url")
      .order("created_at", { ascending: false });

    const { data: usersData, error } = await query;

    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }

    // Filtrar usuarios que ya tienen permisos y @kalia.app
    const filtered = (usersData || [])
      .filter(u => !excludeIds.includes(u.id))
      .filter(u => !u.email?.toLowerCase().endsWith(`@${SUPER_ADMIN_DOMAIN}`));

    return filtered.map(u => ({
      id: u.id,
      email: u.email || "",
      full_name: u.name || null,
      image_url: u.avatar_url || null,
      is_kalia: false,
    }));

  } catch (e) {
    console.error("Error in getAvailableUsers:", e);
    return [];
  }
}

// Obtener logs de auditoría
async function getAuditLogs(limit = 1000): Promise<AuditLog[]> {
  if (!supabaseAdmin) {
    console.error("supabaseAdmin not configured");
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("mercure_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching audit logs:", error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error("Error in getAuditLogs:", e);
    return [];
  }
}

export default async function ConfiguracionPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Solo super admins pueden acceder a esta página
  const isSuper = isSuperAdmin(userEmail);
  
  if (!isSuper && supabaseAdmin) {
    // Verificar si tiene permiso de configuración
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .limit(1);

    const supabaseUserId = userData?.[0]?.id;

    if (!supabaseUserId) {
      redirect("/");
    }

    // Verificar permiso de configuración
    const { data: configPerm } = await supabaseAdmin
      .from("mercure_user_permissions")
      .select("has_access")
      .eq("user_id", supabaseUserId)
      .eq("permission", "configuracion")
      .eq("has_access", true)
      .limit(1);

    if (!configPerm || configPerm.length === 0) {
      redirect("/");
    }
  }

  // Obtener datos en paralelo
  const [usersWithPermissions, auditLogs] = await Promise.all([
    getUsersWithPermissions(),
    getAuditLogs(),
  ]);
  
  // Obtener usuarios disponibles para agregar (solo para super admins)
  const existingUserIds = usersWithPermissions.map(u => u.id);
  const availableUsers = isSuper ? await getAvailableUsers(existingUserIds) : [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <h1 className="text-lg font-medium text-neutral-900">Configuración</h1>
            {isSuper && (
              <Badge variant="success" className="text-xs">
                Super Admin
              </Badge>
            )}
          </div>

          {/* Tabs */}
          <ConfigTabs
            usersWithPermissions={usersWithPermissions}
            availableUsers={availableUsers}
            auditLogs={auditLogs}
            isSuper={isSuper}
          />
        </div>
      </main>
    </div>
  );
}

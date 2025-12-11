import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { canAccessConfig, isSuperAdmin, ROLES } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface UserWithOrg {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  organization_id: string | null;
  created_at: string;
}

async function getUsers(): Promise<UserWithOrg[]> {
  // Traer usuarios con su rol en la organización
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (!users) return [];

  // Traer roles de cada usuario
  const userIds = users.map((u: { id: string }) => u.id);
  const { data: orgs } = await supabase
    .from("user_organizations")
    .select("*")
    .in("user_id", userIds);

  // Combinar datos
  return users.map((user: { id: string; email: string; full_name: string | null; avatar_url: string | null; created_at: string }) => {
    const org = orgs?.find((o: { user_id: string }) => o.user_id === user.id);
    return {
      ...user,
      role: org?.role || null,
      organization_id: org?.organization_id || null,
    };
  });
}

function getRoleBadgeVariant(role: string | null): "default" | "success" | "warning" | "error" | "info" {
  switch (role) {
    case "super_admin":
    case "admin":
      return "success";
    case "administrativo":
    case "contabilidad":
      return "info";
    case "auxiliar_deposito":
    case "chofer":
      return "warning";
    case "viewer":
      return "default";
    default:
      return "default";
  }
}

export default async function ConfiguracionPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Verificar permisos - traer rol del usuario actual
  const { data: currentUserOrg } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("user_id", userId)
    .single();

  const currentRole = currentUserOrg?.role;

  // Solo admins y super admins pueden acceder
  if (!canAccessConfig(currentRole, userEmail)) {
    redirect("/");
  }

  const users = await getUsers();
  const isSuper = isSuperAdmin(userEmail);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
            <div>
              <h1 className="text-lg font-medium text-neutral-900">Configuración</h1>
              <p className="text-sm text-neutral-500 mt-0.5">Gestión de usuarios y permisos</p>
            </div>
            {isSuper && (
              <Badge variant="success" className="text-xs">Super Admin</Badge>
            )}
          </div>

          {/* Usuarios */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Usuarios ({users.length})
              </h2>
              <Button 
                variant="outline" 
                className="h-8 px-3 text-sm border-neutral-200 hover:bg-neutral-50"
                disabled
              >
                + Invitar usuario
              </Button>
            </div>

            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Usuario</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Rol</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Desde</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-neutral-400">
                        No hay usuarios registrados
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600">
                              {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-neutral-900">
                              {u.full_name || "Sin nombre"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-neutral-600">
                          {u.email}
                          {isSuperAdmin(u.email) && (
                            <span className="ml-1.5 text-orange-500 text-xs">★</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {u.role ? (
                            <Badge variant={getRoleBadgeVariant(u.role)}>
                              {ROLES[u.role as keyof typeof ROLES] || u.role}
                            </Badge>
                          ) : (
                            <span className="text-neutral-400 text-xs">Sin rol</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-neutral-400 text-xs">
                          {new Date(u.created_at).toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-3 py-2">
                          <button 
                            className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                            disabled={isSuperAdmin(u.email) && !isSuper}
                          >
                            Editar rol
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Roles y permisos */}
          <div>
            <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">
              Roles y Permisos
            </h2>
            <div className="border border-neutral-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Rol</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Accesos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Super Admin</td>
                    <td className="px-3 py-2 text-neutral-600">Acceso total al sistema (Kalia)</td>
                    <td className="px-3 py-2"><Badge variant="success">Todo</Badge></td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Administrador</td>
                    <td className="px-3 py-2 text-neutral-600">Gestión completa de Mercure</td>
                    <td className="px-3 py-2"><Badge variant="success">Todo</Badge></td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Administrativo</td>
                    <td className="px-3 py-2 text-neutral-600">Operaciones, viajes, tarifas</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">Recepción, Envíos, Viajes, Vehículos, Entidades, Tarifas</td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Auxiliar Depósito</td>
                    <td className="px-3 py-2 text-neutral-600">Control físico de mercadería</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">Recepción, Envíos</td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Chofer</td>
                    <td className="px-3 py-2 text-neutral-600">Transporte y entregas</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">Envíos, Viajes</td>
                  </tr>
                  <tr className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-medium">Atención al Cliente</td>
                    <td className="px-3 py-2 text-neutral-600">Consultas y seguimiento</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">Entidades, Dashboard</td>
                  </tr>
                  <tr className="border-b border-neutral-100 last:border-0">
                    <td className="px-3 py-2 font-medium">Contabilidad</td>
                    <td className="px-3 py-2 text-neutral-600">Facturación y cobranzas</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">CC, Facturas, Cobranzas, Liquidaciones, Pagos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 bg-neutral-50 border border-neutral-200 rounded p-4">
            <p className="text-xs text-neutral-500">
              <span className="text-orange-500">★</span> indica Super Admin (acceso total).
              Los permisos se aplican automáticamente según el rol asignado.
              Para cambiar el rol de un usuario, contactá a un administrador.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

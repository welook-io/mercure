"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Permission, 
  UserPermissions,
  hasPermission, 
  canAccessRoute, 
  getAccessibleModules,
  isSuperAdmin 
} from "@/lib/permissions";

interface UserPermissionRow {
  permission: string;
  has_access: boolean;
}

interface UserProfileData {
  permissions: UserPermissions;
  email: string | null;
  isLoading: boolean;
  error: Error | null;
  isSuperAdmin: boolean;
  // Métodos de permisos
  can: (permission: Permission) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  accessibleModules: Permission[];
  // Para compatibilidad legacy (deprecated)
  role: string | null;
}

export function useUserProfile(): UserProfileData {
  const { user: clerkUser, isLoaded } = useUser();
  const [data, setData] = useState<{
    permissions: UserPermissions;
    isLoading: boolean;
    error: Error | null;
  }>({
    permissions: {},
    isLoading: true,
    error: null,
  });

  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress || null;
  const isSuper = isSuperAdmin(userEmail);

  // Método para verificar permisos
  const can = useCallback((permission: Permission): boolean => {
    return hasPermission(data.permissions, userEmail, permission);
  }, [data.permissions, userEmail]);

  // Método para verificar acceso a rutas
  const canAccessRouteFn = useCallback((pathname: string): boolean => {
    return canAccessRoute(data.permissions, userEmail, pathname);
  }, [data.permissions, userEmail]);

  // Módulos accesibles
  const accessibleModules = getAccessibleModules(data.permissions, userEmail);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!isLoaded || !clerkUser) {
        setData((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Buscar el usuario en public.users por clerk_id
        const { data: usersData, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", clerkUser.id)
          .limit(1);

        if (userError) {
          console.error("Error fetching user:", userError);
          setData({ permissions: {}, isLoading: false, error: null });
          return;
        }

        const userData = usersData?.[0];
        if (!userData) {
          // Usuario no existe en la tabla users - no es error, solo no tiene perfil
          setData({ permissions: {}, isLoading: false, error: null });
          return;
        }

        // Buscar los permisos en mercure_user_permissions (schema public)
        const { data: permissionsData, error: permError } = await supabase
          .from("mercure_user_permissions")
          .select("permission, has_access")
          .eq("user_id", userData.id)
          .eq("has_access", true);

        if (permError) {
          console.error("Error fetching user permissions:", permError);
          setData({ permissions: {}, isLoading: false, error: null });
          return;
        }

        // Convertir array de permisos a objeto
        const permissions: UserPermissions = {};
        (permissionsData as UserPermissionRow[] || []).forEach((p) => {
          permissions[p.permission] = p.has_access;
        });

        setData({
          permissions,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error in useUserProfile:", error);
        setData({
          permissions: {},
          isLoading: false,
          error: null,
        });
      }
    }

    fetchUserProfile();
  }, [clerkUser, isLoaded]);

  return {
    ...data,
    email: userEmail,
    isSuperAdmin: isSuper,
    can,
    canAccessRoute: canAccessRouteFn,
    accessibleModules,
    // Legacy: devolver null como role para compatibilidad
    role: null,
  };
}

// Labels para roles (legacy, mantener para UI)
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  owner: "Propietario",
  member: "Miembro",
  viewer: "Visor",
  editor: "Editor",
  auxiliar_deposito: "Auxiliar Depósito",
  administrativo: "Administrativo",
  chofer: "Chofer",
  atencion_cliente: "Atención al Cliente",
  contabilidad: "Contabilidad",
};

"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { 
  Permission, 
  UserPermissions,
  hasPermission, 
  canAccessRoute, 
  getAccessibleModules,
  isSuperAdmin 
} from "@/lib/permissions";

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
        // Usar API route para obtener permisos (componente cliente no puede usar supabaseAdmin)
        const response = await fetch("/api/user-profile");
        
        if (!response.ok) {
          throw new Error("Error al obtener perfil de usuario");
        }

        const { permissions, email: apiEmail } = await response.json();

        setData({
          permissions: permissions || {},
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error in useUserProfile:", error);
        setData({
          permissions: {},
          isLoading: false,
          error: error instanceof Error ? error : new Error("Error desconocido"),
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

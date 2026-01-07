"use client";

import { createContext, useContext, ReactNode } from "react";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { Permission, UserPermissions } from "@/lib/permissions";

interface PermissionsContextValue {
  permissions: UserPermissions;
  email: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  can: (permission: Permission) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  accessibleModules: Permission[];
  // Legacy
  role: string | null;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const profile = useUserProfile();

  return (
    <PermissionsContext.Provider
      value={{
        permissions: profile.permissions,
        email: profile.email,
        isLoading: profile.isLoading,
        isSuperAdmin: profile.isSuperAdmin,
        can: profile.can,
        canAccessRoute: profile.canAccessRoute,
        accessibleModules: profile.accessibleModules,
        role: profile.role,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}












"use client";

import { createContext, useContext, ReactNode } from "react";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { Permission } from "@/lib/permissions";

interface PermissionsContextValue {
  role: string | null;
  email: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  can: (permission: Permission) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  accessibleModules: Permission[];
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const profile = useUserProfile();

  return (
    <PermissionsContext.Provider
      value={{
        role: profile.role,
        email: profile.email,
        isLoading: profile.isLoading,
        isSuperAdmin: profile.isSuperAdmin,
        can: profile.can,
        canAccessRoute: profile.canAccessRoute,
        accessibleModules: profile.accessibleModules,
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


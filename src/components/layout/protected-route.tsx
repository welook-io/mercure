"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { AccessDenied } from "./access-denied";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const pathname = usePathname();
  const { canAccessRoute, isLoading, isSuperAdmin } = useUserProfile();

  // Mientras carga, mostrar contenido (evita flash)
  if (isLoading) {
    return <>{children}</>;
  }

  // Super admins siempre tienen acceso
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Verificar acceso a la ruta actual
  if (!canAccessRoute(pathname)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}












"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessDeniedProps {
  message?: string;
}

export function AccessDenied({ message }: AccessDeniedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-lg font-medium text-neutral-900 mb-2">
          Acceso denegado
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          {message || "No tenés permiso para acceder a esta sección. Contactá a un administrador si necesitás acceso."}
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button variant="outline" className="h-8 px-3 text-sm">
              Ir al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}













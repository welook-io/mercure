"use client";

import Image from "next/image";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function SolicitarAccesoClient({ email }: { email: string }) {
  const { signOut } = useClerk();

  const handleSignOut = () => {
    signOut({ redirectUrl: "/sign-in" });
  };

  const handleRefresh = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/kalia_logos/kalia_logo_black.svg"
            alt="Kalia"
            width={100}
            height={32}
            priority
          />
        </div>

        {/* Ícono */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Mensaje */}
        <h1 className="text-lg font-medium text-neutral-900 mb-2">
          Acceso pendiente
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          Tu cuenta <span className="font-medium text-neutral-700">{email}</span> no tiene acceso a Mercure todavía.
        </p>

        {/* Instrucciones */}
        <div className="bg-neutral-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs font-medium text-neutral-700 mb-2">Para solicitar acceso:</p>
          <ul className="text-xs text-neutral-500 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-neutral-400">1.</span>
              Contactá al administrador de tu empresa
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-400">2.</span>
              Indicá tu email: <span className="font-mono text-neutral-600">{email}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-400">3.</span>
              Esperá la confirmación de acceso
            </li>
          </ul>
        </div>

        {/* Contacto */}
        <div className="border border-neutral-200 rounded-lg p-4 mb-6">
          <p className="text-xs text-neutral-500 mb-3">Contacto del administrador:</p>
          <a 
            href={`mailto:cgriotti@mercuresrl.com?subject=Solicitud de acceso a Kalia - Mercure&body=Hola, solicito acceso al sistema.%0A%0AMi email es: ${email}%0A%0AGracias.`}
            className="flex items-center justify-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            cgriotti@mercuresrl.com
          </a>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full h-10 text-sm border-neutral-200"
            onClick={handleRefresh}
          >
            Ya tengo acceso, verificar
          </Button>
          <button 
            type="button"
            onClick={handleSignOut}
            className="w-full text-xs text-neutral-400 hover:text-neutral-600"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-neutral-100">
          <p className="text-xs text-neutral-400">
            Powered by <span className="font-medium text-neutral-500">Kalia</span>
          </p>
        </div>
      </div>
    </div>
  );
}

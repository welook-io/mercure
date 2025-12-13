"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings } from "lucide-react";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import { isSuperAdmin } from "@/lib/permissions";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { permissions, can } = useUserProfile();

  if (!user) return null;

  const initials = user.firstName 
    ? user.firstName[0].toUpperCase()
    : user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || "U";

  const userEmail = user.emailAddresses[0]?.emailAddress;
  const displayName = user.fullName || userEmail?.split("@")[0] || "Usuario";
  
  // Verificar si puede acceder a configuración
  const showConfig = can("configuracion");
  const isSuper = isSuperAdmin(userEmail);

  // Contar permisos activos
  const activePermissions = Object.values(permissions).filter(Boolean).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 outline-none group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white truncate max-w-[150px]">
              {displayName}
            </p>
            <p className="text-xs text-white/60 truncate max-w-[150px]">
              {userEmail}
            </p>
          </div>
          <div className="relative">
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent group-hover:ring-zinc-600 transition-all">
              <AvatarFallback className="bg-zinc-700 text-zinc-300 text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isSuper && (
              <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[9px] font-medium px-1 py-0.5 rounded-full leading-none">
                ★
              </span>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56 mt-2">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-neutral-900 truncate">
            {displayName}
          </p>
          <p className="text-xs text-neutral-500 truncate">
            {userEmail}
          </p>
          {isSuper ? (
            <p className="text-xs text-orange-500 font-medium mt-1">
              ★ Super Admin
            </p>
          ) : activePermissions > 0 ? (
            <p className="text-xs text-neutral-600 font-medium mt-1">
              {activePermissions} permisos activos
            </p>
          ) : null}
        </div>
        
        <DropdownMenuSeparator />
        
        {showConfig && (
          <>
            <DropdownMenuItem 
              className="cursor-pointer"
              onClick={() => router.push("/configuracion")}
            >
              <Settings className="mr-2 h-4 w-4 text-neutral-500" />
              <span>Configuración</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem 
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={() => signOut(() => router.push("/sign-in"))}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

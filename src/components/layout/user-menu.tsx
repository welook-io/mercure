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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, User } from "lucide-react";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  if (!user) return null;

  const initials = user.firstName && user.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 outline-none">
          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-neutral-600 transition-all">
            <AvatarImage src={user.imageUrl} alt={user.fullName || "Usuario"} />
            <AvatarFallback className="bg-neutral-700 text-white text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56 mt-2">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-neutral-900 truncate">
            {user.fullName || "Usuario"}
          </p>
          <p className="text-xs text-neutral-500 truncate">
            {user.emailAddresses[0]?.emailAddress}
          </p>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => router.push("/perfil")}
        >
          <User className="mr-2 h-4 w-4 text-neutral-500" />
          <span>Mi perfil</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => router.push("/configuracion")}
        >
          <Settings className="mr-2 h-4 w-4 text-neutral-500" />
          <span>Configuración</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
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


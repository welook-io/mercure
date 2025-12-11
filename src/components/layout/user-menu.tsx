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
import { LogOut } from "lucide-react";
import { useUserProfile, ROLE_LABELS } from "@/lib/hooks/use-user-profile";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { organization } = useUserProfile();

  if (!user) return null;

  const initials = user.firstName && user.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || "U";

  const userEmail = user.emailAddresses[0]?.emailAddress;
  const displayName = user.fullName || userEmail?.split("@")[0] || "Usuario";
  const roleLabel = organization?.role 
    ? ROLE_LABELS[organization.role] || organization.role 
    : null;

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
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent group-hover:ring-neutral-600 transition-all">
              <AvatarImage src={user.imageUrl} alt={displayName} />
              <AvatarFallback className="bg-neutral-700 text-white text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            {roleLabel && (
              <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none">
                {roleLabel.slice(0, 3).toUpperCase()}
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
          {roleLabel && (
            <p className="text-xs text-orange-600 font-medium mt-1">
              {roleLabel}
            </p>
          )}
        </div>
        
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


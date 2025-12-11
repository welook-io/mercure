"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserProfileData {
  user: UserProfile | null;
  organization: UserOrganization | null;
  isLoading: boolean;
  error: Error | null;
}

export function useUserProfile(): UserProfileData {
  const { user: clerkUser, isLoaded } = useUser();
  const [data, setData] = useState<UserProfileData>({
    user: null,
    organization: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchUserProfile() {
      if (!isLoaded || !clerkUser) {
        setData((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

        if (!userEmail) {
          setData((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Fetch user from public.users by email
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("email", userEmail)
          .single();

        if (userError && userError.code !== "PGRST116") {
          throw userError;
        }

        let organizationData = null;

        if (userData) {
          // Fetch user organization role
          const { data: orgData, error: orgError } = await supabase
            .from("user_organizations")
            .select("*")
            .eq("user_id", userData.id)
            .single();

          if (orgError && orgError.code !== "PGRST116") {
            throw orgError;
          }

          organizationData = orgData;
        }

        setData({
          user: userData,
          organization: organizationData,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: error as Error,
        }));
      }
    }

    fetchUserProfile();
  }, [clerkUser, isLoaded]);

  return data;
}

// Labels para roles
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

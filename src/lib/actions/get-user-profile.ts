"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

interface UserProfileResult {
  role: string | null;
  userId: string | null;
}

export async function getUserProfileAction(): Promise<UserProfileResult> {
  const { userId: clerkId } = await auth();
  
  if (!clerkId || !supabaseAdmin) {
    return { role: null, userId: null };
  }

  try {
    // Buscar el usuario en public.users por clerk_id
    const { data: usersData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .limit(1);

    if (userError || !usersData?.[0]) {
      return { role: null, userId: null };
    }

    const supabaseUserId = usersData[0].id;

    // Buscar el rol en mercure_user_roles (schema public)
    const { data: rolesData, error: roleError } = await supabaseAdmin
      .from("mercure_user_roles")
      .select("role")
      .eq("user_id", supabaseUserId)
      .eq("is_active", true)
      .limit(1);

    if (roleError) {
      return { role: null, userId: supabaseUserId };
    }

    return {
      role: rolesData?.[0]?.role || null,
      userId: supabaseUserId,
    };
  } catch (error) {
    console.error("Error in getUserProfileAction:", error);
    return { role: null, userId: null };
  }
}



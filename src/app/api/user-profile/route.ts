import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isSuperAdmin, ALL_PERMISSIONS, UserPermissions } from "@/lib/permissions";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId || !supabaseAdmin) {
      return NextResponse.json({ permissions: {}, email: null });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress || null;

    // Super admins tienen todos los permisos
    if (userEmail && isSuperAdmin(userEmail)) {
      const allPermissions: UserPermissions = {};
      ALL_PERMISSIONS.forEach(p => {
        allPermissions[p] = true;
      });
      return NextResponse.json({ permissions: allPermissions, email: userEmail });
    }

    // Buscar el usuario en public.users por clerk_id
    const { data: usersData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .limit(1);

    if (userError || !usersData?.[0]) {
      return NextResponse.json({ permissions: {}, email: userEmail });
    }

    const supabaseUserId = usersData[0].id;

    // Buscar los permisos en mercure.user_permissions
    const { data: permissionsData, error: permError } = await supabaseAdmin
      .schema("mercure")
      .from("user_permissions")
      .select("permission, has_access")
      .eq("user_id", supabaseUserId)
      .eq("has_access", true);

    if (permError) {
      console.error("Error fetching user permissions:", permError);
      return NextResponse.json({ permissions: {}, email: userEmail });
    }

    // Convertir array de permisos a objeto
    const permissions: UserPermissions = {};
    (permissionsData || []).forEach((p: { permission: string; has_access: boolean }) => {
      permissions[p.permission] = p.has_access;
    });

    return NextResponse.json({ permissions, email: userEmail });
  } catch (error) {
    console.error("Error in user-profile API:", error);
    return NextResponse.json(
      { error: "Error al obtener perfil de usuario" },
      { status: 500 }
    );
  }
}

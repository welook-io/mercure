import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasAccess } from "@/lib/auth";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { PermissionsProvider } from "@/lib/contexts/permissions-context";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Obtener email para verificar super admin
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Verificar si tiene acceso (rol asignado o super admin)
  const userHasAccess = await hasAccess(userId, userEmail);
  if (!userHasAccess) {
    redirect("/solicitar-acceso");
  }

  return (
    <PermissionsProvider>
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
    </PermissionsProvider>
  );
}



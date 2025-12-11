import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasAccess } from "@/lib/auth";
import { SolicitarAccesoClient } from "./client";

export default async function SolicitarAccesoPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress || "";

  // Si ya tiene acceso (incluyendo super admins), redirigir al dashboard
  const userHasAccess = await hasAccess(userId, email);
  if (userHasAccess) {
    redirect("/");
  }

  return <SolicitarAccesoClient email={email} />;
}

"use client";

import { useAuth } from "@clerk/nextjs";
import { KaliaImprovementsProvider } from "@/lib/contexts/kalia-improvements-context";
import { KaliaImprovementsChatWidget } from "./chat-widget";
import { ReactNode } from "react";

interface KaliaImprovementsWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper that provides the Kalia Improvements context and chat widget
 * Only shows the widget for authenticated users
 */
export function KaliaImprovementsWrapper({ children }: KaliaImprovementsWrapperProps) {
  const { isSignedIn } = useAuth();

  // If not authenticated, just render children without the widget
  if (!isSignedIn) {
    return <>{children}</>;
  }

  return (
    <KaliaImprovementsProvider>
      {children}
      <KaliaImprovementsChatWidget />
    </KaliaImprovementsProvider>
  );
}



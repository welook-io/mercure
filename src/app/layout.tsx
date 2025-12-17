import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { KaliaImprovementsWrapper } from "@/components/kalia-improvements";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kalia - Mercure",
  description: "Sistema de gestión logística",
  icons: {
    icon: "/kalia_logos/kalia_isologo_black.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <KaliaImprovementsWrapper>
            {children}
          </KaliaImprovementsWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}

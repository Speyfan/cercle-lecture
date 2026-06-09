import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Cercle de Lecture",
  description: "Partagez vos lectures et recevez des recommandations personnalisées.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="fr">
      <body className="bg-stone-50 text-stone-900 min-h-screen">
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}

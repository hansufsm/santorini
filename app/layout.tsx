import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/convex-provider";
import { AuthProvider } from "@/lib/auth";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AMRTS Santorini — Gestão Residencial",
  description: "Sistema de Gestão Financeira e Societária — Residencial Santorini",
  icons: {
    icon: [
      { url: "/logo-amtrs-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-amtrs-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/logo-amtrs-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${geist.className} min-h-screen antialiased`} style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}>
        {/* ConvexClientProvider: conecta ao banco Convex em tempo real */}
        <ConvexClientProvider>
          {/* AuthProvider: gerencia sessão do usuário logado */}
          <AuthProvider>
            {children}
          </AuthProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

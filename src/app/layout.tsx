import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinanzaHoy — Gestión financiera para tu negocio",
  description:
    "Control de ventas, gastos, cartera y flujo de caja para pequeños emprendimientos. Simple, rápido y diseñado para comerciantes colombianos.",
  keywords: ["finanzas", "ventas", "gastos", "fiados", "emprendimiento", "Colombia"],
  authors: [{ name: "Grupo 13 — Politécnico Grancolombiano" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

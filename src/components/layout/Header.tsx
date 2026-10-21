"use client";

import { usePathname } from "next/navigation";
import { Bell, Calendar } from "lucide-react";
import { formatFechaLarga } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/ventas": "Ventas / POS",
  "/dashboard/gastos": "Gastos",
  "/dashboard/cartera": "Cartera / Fiados",
  "/dashboard/flujo-caja": "Flujo de Caja",
  "/dashboard/productos": "Catálogo de Productos",
};

export function Header() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "FinanzaHoy";
  const hoy = formatFechaLarga(new Date());

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <Calendar className="w-3 h-3" />
          {hoy}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
          DR
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingDown,
  Users,
  BarChart3,
  Package,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/ventas",
    label: "Ventas / POS",
    icon: ShoppingCart,
  },
  {
    href: "/dashboard/gastos",
    label: "Gastos",
    icon: TrendingDown,
  },
  {
    href: "/dashboard/cartera",
    label: "Cartera / Fiados",
    icon: Users,
  },
  {
    href: "/dashboard/flujo-caja",
    label: "Flujo de Caja",
    icon: BarChart3,
  },
  {
    href: "/dashboard/productos",
    label: "Productos",
    icon: Package,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">FinanzaHoy</h1>
            <p className="text-slate-400 text-xs mt-0.5">Tu negocio en control</p>
          </div>
        </div>
      </div>

      {/* Negocio activo */}
      <div className="px-4 py-3 mx-3 mt-3 bg-slate-800 rounded-lg">
        <p className="text-slate-400 text-xs">Negocio activo</p>
        <p className="text-sm font-medium text-white truncate">Tienda La Esperanza</p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3 mt-2 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
            DR
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">Diego Rodríguez</p>
            <p className="text-xs text-slate-400">Administrador</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 text-center">
          FinanzaHoy v1.0 · Grupo 13
        </p>
      </div>
    </aside>
  );
}

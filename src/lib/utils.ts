// lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un número como moneda colombiana (COP)
 */
export function formatCOP(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formatea número compacto (ej: 1.2M, 450K)
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return formatCOP(value);
}

/**
 * Formatea fecha en español Colombia
 */
export function formatFecha(date: Date | string, fmt = "dd/MM/yyyy"): string {
  return format(new Date(date), fmt, { locale: es });
}

export function formatFechaLarga(date: Date | string): string {
  return format(new Date(date), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * Calcula días transcurridos desde una fecha
 */
export function diasDesde(date: Date | string): number {
  return differenceInDays(new Date(), new Date(date));
}

/**
 * Clasificación semáforo de cartera (RF-05)
 * Verde: 1-7 días | Amarillo: 8-15 días | Rojo: >15 días
 */
export type SemaforoColor = "verde" | "amarillo" | "rojo";

export function getSemaforoCartera(dias: number): SemaforoColor {
  if (dias <= 7) return "verde";
  if (dias <= 15) return "amarillo";
  return "rojo";
}

export const SEMAFORO_CONFIG = {
  verde: {
    label: "Al día",
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
    dot: "bg-green-500",
    emoji: "🟢",
  },
  amarillo: {
    label: "Por vencer",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
    dot: "bg-yellow-500",
    emoji: "🟡",
  },
  rojo: {
    label: "Vencido",
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    dot: "bg-red-500",
    emoji: "🔴",
  },
};

/**
 * Variación porcentual entre dos valores
 */
export function variacion(actual: number, anterior: number): number {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return ((actual - anterior) / anterior) * 100;
}

/**
 * Colores para medios de pago
 */
export const MEDIOS_PAGO_COLORES: Record<string, string> = {
  Efectivo: "#22c55e",
  Nequi: "#8b5cf6",
  Daviplata: "#f59e0b",
  Tarjeta: "#3b82f6",
  Fiado: "#ef4444",
};

export const MEDIOS_PAGO_NOMBRES = ["Efectivo", "Nequi", "Daviplata", "Tarjeta", "Fiado"];

/**
 * Categorías de gastos predefinidas
 */
export const CATEGORIAS_GASTO = [
  { nombre: "Mercancía", color: "#f97316", icono: "📦" },
  { nombre: "Nómina", color: "#8b5cf6", icono: "👥" },
  { nombre: "Servicios", color: "#3b82f6", icono: "⚡" },
  { nombre: "Arriendo", color: "#ec4899", icono: "🏪" },
  { nombre: "Imprevistos", color: "#ef4444", icono: "🔧" },
  { nombre: "Retiro Personal", color: "#f59e0b", icono: "💸" },
  { nombre: "Marketing", color: "#10b981", icono: "📣" },
  { nombre: "Transporte", color: "#6366f1", icono: "🚗" },
];

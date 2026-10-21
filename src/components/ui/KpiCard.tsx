import { cn, formatCOP } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  titulo: string;
  valor: number;
  variacion?: number;      // porcentaje vs período anterior
  subtitulo?: string;
  icono: LucideIcon;
  colorIcono?: string;     // clase Tailwind de color
  bgIcono?: string;
  alerta?: boolean;
  className?: string;
}

export function KpiCard({
  titulo,
  valor,
  variacion,
  subtitulo,
  icono: Icon,
  colorIcono = "text-blue-600",
  bgIcono = "bg-blue-50",
  alerta = false,
  className,
}: KpiCardProps) {
  const esPositivo = variacion !== undefined && variacion >= 0;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow",
        alerta && "border-red-200 bg-red-50",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-lg", alerta ? "bg-red-100" : bgIcono)}>
          <Icon
            className={cn("w-5 h-5", alerta ? "text-red-600" : colorIcono)}
          />
        </div>
        {variacion !== undefined && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full",
              esPositivo
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            )}
          >
            {esPositivo ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {esPositivo ? "+" : ""}
            {variacion.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{formatCOP(valor)}</p>
      <p className="text-sm font-medium text-gray-500 mt-1">{titulo}</p>
      {subtitulo && (
        <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { KpiCard } from "@/components/ui/KpiCard";
import { formatCOP, formatFecha, variacion, MEDIOS_PAGO_COLORES } from "@/lib/utils";

interface DashboardData {
  kpis: {
    gananciaNeta: number;
    totalVentasHoy: number;
    totalVentasAyer: number;
    totalGastosHoy: number;
    totalCarteraVencida: number;
    clientesVencidos: number;
    transaccionesHoy: number;
    metaMes: number;
  };
  ventasSemana: Array<{ dia: string; total: number }>;
  topProductos: Array<{ nombre: string; total: number; unidades: number }>;
  arqueoHoy: {
    montoEsperado: number;
    montoFisico: number;
    diferencia: number;
    detalles: Array<{ medioPago: string; monto: number }>;
  } | null;
  desgloseMediosHoy: Record<string, number>;
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Tooltip personalizado para el gráfico
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-bold text-blue-600">{formatCOP(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-500">Cargando dashboard...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-500">
        Error al cargar los datos. Verifica la conexión a la base de datos.
      </div>
    );
  }

  const { kpis, ventasSemana, topProductos, arqueoHoy, desgloseMediosHoy } = data;
  const varVentas = variacion(kpis.totalVentasHoy, kpis.totalVentasAyer);
  const maxVenta = Math.max(...ventasSemana.map((v) => v.total), 1);

  // Preparar datos para gráfico de barras (últimos 7 días)
  const chartData = ventasSemana.map((v, idx) => ({
    dia: DIAS_SEMANA[new Date(v.dia).getDay()] ?? `Día ${idx + 1}`,
    ventas: v.total,
  }));

  const metaPorcentaje = Math.min(
    100,
    Math.round((kpis.totalVentasHoy / (kpis.metaMes / 30)) * 100)
  );

  return (
    <div className="space-y-6 fade-in">
      {/* Alerta de cartera vencida */}
      {kpis.clientesVencidos > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Cartera con vencimientos críticos
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              {kpis.clientesVencidos} clientes llevan más de 15 días sin pagar.
              Total en riesgo: <strong>{formatCOP(kpis.totalCarteraVencida)}</strong>. Se
              recomienda gestión inmediata.
            </p>
          </div>
          <Link
            href="/dashboard/cartera"
            className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap"
          >
            Ver Cartera <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          titulo="Ganancia Neta Hoy"
          valor={kpis.gananciaNeta}
          variacion={varVentas}
          subtitulo="Ventas - Gastos del día"
          icono={DollarSign}
          colorIcono="text-green-600"
          bgIcono="bg-green-50"
        />
        <KpiCard
          titulo="Total Ventas Hoy"
          valor={kpis.totalVentasHoy}
          variacion={varVentas}
          subtitulo={`Meta diaria: ${metaPorcentaje}% (${kpis.transaccionesHoy} transacciones)`}
          icono={TrendingUp}
          colorIcono="text-blue-600"
          bgIcono="bg-blue-50"
        />
        <KpiCard
          titulo="Gastos del Día"
          valor={kpis.totalGastosHoy}
          subtitulo={`Margen: ${kpis.totalVentasHoy > 0 ? ((kpis.gananciaNeta / kpis.totalVentasHoy) * 100).toFixed(1) : "0"}%`}
          icono={TrendingDown}
          colorIcono="text-yellow-600"
          bgIcono="bg-yellow-50"
        />
        <KpiCard
          titulo="Cartera Vencida"
          valor={kpis.totalCarteraVencida}
          subtitulo={`${kpis.clientesVencidos} clientes críticos`}
          icono={Users}
          colorIcono="text-red-600"
          bgIcono="bg-red-50"
          alerta={kpis.clientesVencidos > 0}
        />
      </div>

      {/* Gráfico de ventas + Top productos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gráfico ventas semana */}
        <div className="xl:col-span-2 bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-800">Ventas por Día — Semana Actual</h3>
              <p className="text-xs text-gray-400 mt-0.5">Ingresos diarios de lunes a domingo</p>
            </div>
            <Link
              href="/dashboard/ventas"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              Ver detalle <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              Sin ventas esta semana
            </div>
          )}
        </div>

        {/* Top 5 productos */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-800">Top 5 Productos</h3>
            <span className="text-xs text-gray-400">Últimos 7 días</span>
          </div>
          {topProductos.length > 0 ? (
            <div className="space-y-4">
              {topProductos.map((p, idx) => {
                const pct = Math.round((p.total / (topProductos[0]?.total || 1)) * 100);
                return (
                  <div key={p.nombre}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[140px]">
                        {idx + 1}. {p.nombre}
                      </span>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900">{formatCOP(p.total)}</p>
                        <p className="text-xs text-gray-400">{p.unidades} uds.</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
              Sin ventas registradas
            </div>
          )}
        </div>
      </div>

      {/* Arqueo de caja */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">Arqueo de Caja — Hoy</h3>
            {arqueoHoy && arqueoHoy.diferencia === 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Caja Cuadrada
              </span>
            )}
            {arqueoHoy && arqueoHoy.diferencia !== 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Descuadre: {formatCOP(Math.abs(arqueoHoy.diferencia))}
              </span>
            )}
          </div>
          <Link
            href="/dashboard/ventas"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Registrar arqueo
          </Link>
        </div>

        {arqueoHoy ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Esperado en Sistema</p>
              <p className="text-lg font-bold text-gray-900">{formatCOP(arqueoHoy.montoEsperado)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Físico Contado</p>
              <p className="text-lg font-bold text-gray-900">{formatCOP(arqueoHoy.montoFisico)}</p>
            </div>
            <div
              className={`rounded-lg p-4 text-center ${arqueoHoy.diferencia === 0 ? "bg-green-50" : "bg-red-50"}`}
            >
              <p className="text-xs text-gray-500 mb-1">Diferencia</p>
              <p
                className={`text-lg font-bold ${arqueoHoy.diferencia === 0 ? "text-green-700" : "text-red-700"}`}
              >
                {formatCOP(arqueoHoy.diferencia)}
              </p>
            </div>
            <div className="space-y-2">
              {arqueoHoy.detalles.map((d) => (
                <div key={d.medioPago} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{d.medioPago}</span>
                  <span className="text-xs font-semibold text-gray-800">
                    {formatCOP(d.monto)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm mb-3">No hay arqueo registrado para hoy.</p>
            <p className="text-gray-500 text-sm font-medium">
              Ventas registradas hoy: {formatCOP(kpis.totalVentasHoy)}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 justify-center">
              {Object.entries(desgloseMediosHoy).map(([medio, monto]) => (
                <span
                  key={medio}
                  className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                >
                  {medio}: {formatCOP(monto)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

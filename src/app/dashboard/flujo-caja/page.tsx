"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Gauge } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { formatCOP, formatFecha } from "@/lib/utils";

interface FlujoCajaData {
  kpis: {
    totalIngresos: number;
    totalEgresos: number;
    flujoNeto: number;
    margen: number;
    transacciones: number;
    registrosGasto: number;
    saldoCaja: number;
  };
  semanas: Array<{ semana: string; ingresos: number; egresos: number; flujo: number }>;
  egresosCategoria: Array<{ nombre: string; total: number; color: string }>;
  ingresosMedio: Array<{ nombre: string; total: number; porcentaje: number }>;
  topEgresos: Array<{ fecha: string; categoria: string; concepto: string; monto: number }>;
  proyeccion: {
    dias: number;
    superavitDiario: number;
    tendenciaActual: number;
    escenarioAlerta: number;
    escenarioCritico: number;
    ingresosProyectados: number;
    egresosProyectados: number;
  };
}

function CustomTooltipBar({ active, payload, label }: any) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatCOP(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

const COLORES_PIE = ["#f97316", "#8b5cf6", "#3b82f6", "#ec4899", "#ef4444", "#f59e0b"];

export default function FlujoCajaPage() {
  const [data, setData] = useState<FlujoCajaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("mes");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/flujo-caja?periodo=${periodo}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [periodo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-500">Cargando flujo de caja...</span>
      </div>
    );
  }

  if (!data) return <p className="text-gray-500 text-center py-16">Error al cargar datos</p>;

  const { kpis, semanas, egresosCategoria, topEgresos, proyeccion } = data;
  const esSuperavit = kpis.flujoNeto >= 0;

  // Gauge del flujo neto: porcentaje relativo a ingresos
  const flujoGaugePct = kpis.totalIngresos > 0
    ? Math.min(100, Math.max(0, (kpis.flujoNeto / kpis.totalIngresos) * 100))
    : 0;

  const escenarios = [
    {
      label: "Tendencia actual",
      descripcion: "Mantener ritmo actual",
      valor: proyeccion.tendenciaActual,
      color: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      label: "Alerta (+15% egresos)",
      descripcion: "Si egresos suben 15%",
      valor: proyeccion.escenarioAlerta,
      color: "text-yellow-700",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
    },
    {
      label: "Crítico (+20% egresos)",
      descripcion: "Zona de riesgo",
      valor: proyeccion.escenarioCritico,
      color: proyeccion.escenarioCritico > 0 ? "text-red-700" : "text-red-900",
      bg: "bg-red-50",
      border: "border-red-200",
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Selector de período */}
      <div className="flex gap-2">
        {[
          { key: "hoy", label: "Hoy" },
          { key: "semana", label: "Esta semana" },
          { key: "mes", label: "Este mes" },
          { key: "trimestre", label: "Trimestre" },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodo(p.key)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              periodo === p.key
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-blue-600 text-white rounded-xl p-5 shadow-sm">
          <p className="text-blue-200 text-xs">Total Ingresos</p>
          <p className="text-2xl font-bold mt-1">{formatCOP(kpis.totalIngresos)}</p>
          <p className="text-blue-200 text-xs mt-1">{kpis.transacciones} transacciones</p>
        </div>
        <div className="bg-orange-500 text-white rounded-xl p-5 shadow-sm">
          <p className="text-orange-100 text-xs">Total Egresos</p>
          <p className="text-2xl font-bold mt-1">{formatCOP(kpis.totalEgresos)}</p>
          <p className="text-orange-100 text-xs mt-1">{kpis.registrosGasto} registros</p>
        </div>
        <div className={`${esSuperavit ? "bg-green-600" : "bg-red-600"} text-white rounded-xl p-5 shadow-sm`}>
          <p className="text-xs opacity-80">Flujo Neto</p>
          <p className="text-2xl font-bold mt-1">
            {esSuperavit ? "+" : ""}{formatCOP(kpis.flujoNeto)}
          </p>
          <p className="text-xs opacity-80 mt-1">
            Margen: {kpis.margen.toFixed(1)}% {esSuperavit ? "— Superávit" : "— Déficit"}
          </p>
        </div>
        <div className="bg-amber-500 text-white rounded-xl p-5 shadow-sm">
          <p className="text-amber-100 text-xs">Saldo en Caja</p>
          <p className="text-2xl font-bold mt-1">{formatCOP(kpis.saldoCaja)}</p>
          <p className="text-amber-100 text-xs mt-1">Saldo acumulado</p>
        </div>
      </div>

      {/* Gráfico ingresos vs egresos */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-5">Ingresos vs Egresos por Semana</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={semanas} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="semana" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltipBar />} />
            <Legend formatter={(v) => <span className="text-xs">{v === "ingresos" ? "Ingresos" : v === "egresos" ? "Egresos" : "Flujo Neto"}</span>} />
            <Bar dataKey="ingresos" name="ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="egresos" name="egresos" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Line type="monotone" dataKey="flujo" name="flujo" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: "#22c55e" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Distribución egresos + Top egresos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Dona categorías */}
        {egresosCategoria.length > 0 && (
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Distribución de Egresos</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={egresosCategoria} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="total" nameKey="nombre">
                  {egresosCategoria.map((entry, idx) => (
                    <Cell key={entry.nombre} fill={entry.color ?? COLORES_PIE[idx % COLORES_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCOP(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {egresosCategoria.slice(0, 5).map((cat, idx) => (
                <div key={cat.nombre} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color ?? COLORES_PIE[idx % COLORES_PIE.length] }} />
                    {cat.nombre}
                  </span>
                  <span className="font-semibold text-gray-700">{formatCOP(cat.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top egresos */}
        <div className="xl:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Top Egresos del Período</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-left">Concepto</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topEgresos.map((e, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500">{formatFecha(e.fecha)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{e.categoria}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{e.concepto}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-red-600">{formatCOP(e.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Proyección 30 días */}
      <div className="bg-slate-800 text-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-lg">Proyección de Flujo — 30 días</h3>
            <p className="text-slate-400 text-sm mt-0.5">
              Superávit diario promedio:{" "}
              <strong className="text-green-400">{formatCOP(proyeccion.superavitDiario)}/día</strong>
            </p>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-1 ${flujoGaugePct >= 25 ? "text-green-400" : flujoGaugePct >= 10 ? "text-yellow-400" : "text-red-400"}`}>
              {flujoGaugePct.toFixed(0)}%
            </div>
            <p className="text-slate-400 text-xs">Margen neto</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {escenarios.map((e) => (
            <div key={e.label} className={`rounded-lg p-4 border ${e.bg} ${e.border}`}>
              <p className={`text-xs font-semibold ${e.color} mb-1`}>{e.label}</p>
              <p className="text-xs text-gray-500 mb-2">{e.descripcion}</p>
              <p className={`text-xl font-bold ${e.color}`}>
                {e.valor >= 0 ? "+" : ""}{formatCOP(e.valor)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700">
          <div>
            <p className="text-slate-400 text-xs">Ingresos proyectados</p>
            <p className="text-blue-400 font-bold">{formatCOP(proyeccion.ingresosProyectados)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Egresos proyectados</p>
            <p className="text-orange-400 font-bold">{formatCOP(proyeccion.egresosProyectados)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCOP, formatFecha } from "@/lib/utils";

interface Gasto {
  id: string;
  concepto: string;
  monto: number;
  fecha: string;
  categoria: string;
  categoriaColor?: string;
  categoriaIcono?: string;
  nota?: string;
}

interface CatGasto {
  id: string;
  nombre: string;
  color?: string;
  icono?: string;
}

interface GastosData {
  gastos: Gasto[];
  resumen: {
    totalGastos: number;
    registros: number;
    porCategoria: Array<{ nombre: string; total: number; color: string; icono: string }>;
  };
  categorias: CatGasto[];
}

export default function GastosPage() {
  const [data, setData] = useState<GastosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("mes");
  const [openModal, setOpenModal] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    categoriaId: "",
    concepto: "",
    monto: "",
    fecha: new Date().toISOString().split("T")[0],
    nota: "",
  });

  const cargar = async () => {
    setLoading(true);
    const res = await fetch(`/api/gastos?periodo=${periodo}`).then((r) => r.json());
    setData(res);
    if (res.categorias?.length > 0 && !form.categoriaId) {
      setForm((f) => ({ ...f, categoriaId: res.categorias[0].id }));
    }
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [periodo]);

  const registrarGasto = async () => {
    if (!form.concepto || !form.monto || !form.categoriaId) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoriaId: form.categoriaId,
          concepto: form.concepto,
          monto: parseFloat(form.monto),
          fecha: form.fecha,
          nota: form.nota || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      toast.success(`✅ Gasto registrado — ${formatCOP(parseFloat(form.monto))}`);
      setForm((f) => ({ ...f, concepto: "", monto: "", nota: "" }));
      setOpenModal(false);
      await cargar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const pieData = data?.resumen.porCategoria ?? [];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["hoy", "semana", "mes"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                periodo === p
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p === "hoy" ? "Hoy" : p === "semana" ? "Esta semana" : "Este mes"}
            </button>
          ))}
        </div>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Gasto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Categoría *</Label>
                <select
                  value={form.categoriaId}
                  onChange={(e) => setForm((f) => ({ ...f, categoriaId: e.target.value }))}
                  className="w-full mt-1 h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {data?.categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icono} {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Concepto *</Label>
                <Input
                  value={form.concepto}
                  onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
                  placeholder="Ej: Compra de mercancía"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Monto (COP) *</Label>
                  <Input
                    type="number"
                    value={form.monto}
                    onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                    placeholder="150000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Nota (opcional)</Label>
                <Input
                  value={form.nota}
                  onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
                  placeholder="Información adicional"
                  className="mt-1"
                />
              </div>
              <Button onClick={registrarGasto} disabled={guardando} className="w-full">
                {guardando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {guardando ? "Guardando..." : "Registrar Gasto"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI total */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-xs text-gray-500">Total Gastos</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCOP(data.resumen.totalGastos)}</p>
          </div>
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-xs text-gray-500">Registros</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.resumen.registros}</p>
          </div>
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-xs text-gray-500">Mayor Categoría</p>
            <p className="text-lg font-bold text-gray-900 mt-1 truncate">
              {data.resumen.porCategoria[0]?.icono} {data.resumen.porCategoria[0]?.nombre ?? "—"}
            </p>
            <p className="text-sm text-gray-500">{formatCOP(data.resumen.porCategoria[0]?.total ?? 0)}</p>
          </div>
        </div>
      )}

      {/* Gráfico + tabla */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gráfico de dona */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Distribución por Categoría</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="total"
                  nameKey="nombre"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.nombre} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCOP(v)} />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
            {/* Leyenda con porcentajes */}
            <div className="mt-2 space-y-1">
              {pieData.slice(0, 5).map((cat) => (
                <div key={cat.nombre} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                    {cat.icono} {cat.nombre}
                  </span>
                  <span className="font-semibold text-gray-700">{formatCOP(cat.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${pieData.length > 0 ? "xl:col-span-2" : "xl:col-span-3"}`}>
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Gastos Registrados</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : (
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
                  {data?.gastos.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{formatFecha(g.fecha)}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: g.categoriaColor ?? "#6b7280" }}
                          />
                          {g.categoriaIcono} {g.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{g.concepto}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-red-600">
                        {formatCOP(g.monto)}
                      </td>
                    </tr>
                  ))}
                  {(!data?.gastos || data.gastos.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No hay gastos registrados para este período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

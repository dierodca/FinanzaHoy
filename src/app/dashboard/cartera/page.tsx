"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Phone, Loader2, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCOP, formatFecha, getSemaforoCartera, SEMAFORO_CONFIG } from "@/lib/utils";

interface Fiado {
  id: string;
  clienteId: string;
  cliente: string;
  telefono?: string;
  montoOriginal: number;
  saldoPendiente: number;
  dias: number;
  semaforo: "verde" | "amarillo" | "rojo";
  fechaCreacion: string;
  estado: string;
  abonos: Array<{ monto: number; medioPago: string; fecha: string }>;
}

interface CarteraData {
  fiados: Fiado[];
  resumen: {
    totalCartera: number;
    deudaPromedio: number;
    mayorDeuda: { monto: number; cliente: string } | null;
    porSemaforo: { verde: number; amarillo: number; rojo: number };
  };
}

interface MedioPago {
  id: string;
  nombre: string;
  icono?: string;
}

interface Cliente {
  id: string;
  nombre: string;
}

export default function CarteraPage() {
  const [data, setData] = useState<CarteraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState("");
  const [filtroSemaforo, setFiltroSemaforo] = useState<string>("all");
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Modal abono
  const [fiadoSeleccionado, setFiadoSeleccionado] = useState<Fiado | null>(null);
  const [montoAbono, setMontoAbono] = useState("");
  const [medioPagoAbono, setMedioPagoAbono] = useState("");
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  // Modal nuevo fiado
  const [openNuevoFiado, setOpenNuevoFiado] = useState(false);
  const [clienteNuevoFiado, setClienteNuevoFiado] = useState("");
  const [montoNuevoFiado, setMontoNuevoFiado] = useState("");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (buscar) qs.set("buscar", buscar);
    if (filtroSemaforo !== "all") qs.set("semaforo", filtroSemaforo);
    const res = await fetch(`/api/cartera?${qs}`).then((r) => r.json());
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/medios-pago").then((r) => r.json()).then((d) => {
      setMedios(d.medios ?? []);
      if (d.medios?.length > 0) setMedioPagoAbono(d.medios[0].id);
    });
    fetch("/api/clientes").then((r) => r.json()).then((d) => setClientes(d.clientes ?? []));
  }, []);

  useEffect(() => { cargar(); }, [filtroSemaforo]);

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => cargar(), 400);
    return () => clearTimeout(t);
  }, [buscar]);

  const registrarAbono = async () => {
    if (!fiadoSeleccionado || !montoAbono || !medioPagoAbono) {
      toast.error("Completa todos los campos");
      return;
    }
    setGuardandoAbono(true);
    try {
      const res = await fetch(`/api/cartera/${fiadoSeleccionado.id}/abonar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medioPagoId: medioPagoAbono,
          monto: parseFloat(montoAbono),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      toast.success(d.message);
      setFiadoSeleccionado(null);
      setMontoAbono("");
      await cargar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardandoAbono(false);
    }
  };

  const registrarNuevoFiado = async () => {
    if (!clienteNuevoFiado || !montoNuevoFiado) {
      toast.error("Completa cliente y monto");
      return;
    }
    setGuardandoNuevo(true);
    try {
      const res = await fetch("/api/cartera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteNuevoFiado,
          montoOriginal: parseFloat(montoNuevoFiado),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      toast.success(`✅ Fiado registrado para ${d.cliente}`);
      setOpenNuevoFiado(false);
      setClienteNuevoFiado("");
      setMontoNuevoFiado("");
      await cargar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardandoNuevo(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Encabezado con semáforo global */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Filtros semáforo */}
          {[
            { key: "all", label: "Todos" },
            { key: "verde", label: "🟢 Al día" },
            { key: "amarillo", label: "🟡 Por vencer" },
            { key: "rojo", label: "🔴 Vencidos" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroSemaforo(f.key)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filtroSemaforo === f.key
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
              {data && f.key !== "all" && (
                <span className="ml-1.5 text-xs opacity-80">
                  ({data.resumen.porSemaforo[f.key as "verde" | "amarillo" | "rojo"] ?? 0})
                </span>
              )}
            </button>
          ))}
        </div>

        <Dialog open={openNuevoFiado} onOpenChange={setOpenNuevoFiado}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Registrar Fiado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Fiado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Cliente *</Label>
                <select
                  value={clienteNuevoFiado}
                  onChange={(e) => setClienteNuevoFiado(e.target.value)}
                  className="w-full mt-1 h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Monto Fiado (COP) *</Label>
                <Input
                  type="number"
                  value={montoNuevoFiado}
                  onChange={(e) => setMontoNuevoFiado(e.target.value)}
                  placeholder="50000"
                  className="mt-1"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">
                  🟢 Al registrar, el semáforo inicia en <strong>verde</strong> (al día: 1-7 días).<br />
                  Cambia a 🟡 amarillo a los 8 días y a 🔴 rojo después de 15 días.
                </p>
              </div>
              <Button onClick={registrarNuevoFiado} disabled={guardandoNuevo} className="w-full">
                {guardandoNuevo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Registrar Fiado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-xs text-gray-500">Total Cartera</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCOP(data.resumen.totalCartera)}</p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs text-green-600 font-medium">🟢 {data.resumen.porSemaforo.verde}</span>
              <span className="text-xs text-yellow-600 font-medium">🟡 {data.resumen.porSemaforo.amarillo}</span>
              <span className="text-xs text-red-600 font-medium">🔴 {data.resumen.porSemaforo.rojo}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-xs text-gray-500">Deuda Promedio</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCOP(data.resumen.deudaPromedio)}</p>
          </div>
          {data.resumen.mayorDeuda && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5 shadow-sm">
              <p className="text-xs text-red-500">Mayor Deuda</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
                {formatCOP(data.resumen.mayorDeuda.monto)}
              </p>
              <p className="text-xs text-red-600 mt-0.5 font-medium">{data.resumen.mayorDeuda.cliente}</p>
            </div>
          )}
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar cliente..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabla de fiados */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">
            Clientes con Fiado
            {data && <span className="text-gray-400 font-normal ml-2 text-sm">({data.fiados.length} registros)</span>}
          </h3>
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
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-right">Deuda</th>
                  <th className="px-4 py-3 text-center">Días</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-left">Última actividad</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.fiados.map((f) => {
                  const cfg = SEMAFORO_CONFIG[f.semaforo];
                  return (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">{f.cliente}</p>
                        {f.telefono && (
                          <a
                            href={`tel:${f.telefono}`}
                            className="text-xs text-blue-500 flex items-center gap-0.5 hover:text-blue-700"
                          >
                            <Phone className="w-3 h-3" />
                            {f.telefono}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-bold text-gray-900">{formatCOP(f.saldoPendiente)}</p>
                        {f.saldoPendiente < f.montoOriginal && (
                          <p className="text-xs text-gray-400">de {formatCOP(f.montoOriginal)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-gray-700">{f.dias}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatFecha(f.fechaCreacion)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Dialog
                          open={fiadoSeleccionado?.id === f.id}
                          onOpenChange={(open) => {
                            if (!open) setFiadoSeleccionado(null);
                            else { setFiadoSeleccionado(f); setMontoAbono(""); }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              Abonar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Registrar Abono</DialogTitle>
                            </DialogHeader>
                            {fiadoSeleccionado && (
                              <div className="space-y-4 mt-4">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-sm font-medium text-gray-800">{fiadoSeleccionado.cliente}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Saldo pendiente:{" "}
                                    <strong className="text-red-600">
                                      {formatCOP(fiadoSeleccionado.saldoPendiente)}
                                    </strong>
                                  </p>
                                </div>
                                <div>
                                  <Label>Monto del Abono (COP) *</Label>
                                  <Input
                                    type="number"
                                    value={montoAbono}
                                    onChange={(e) => setMontoAbono(e.target.value)}
                                    placeholder="Ej: 50000"
                                    max={fiadoSeleccionado.saldoPendiente}
                                    className="mt-1"
                                  />
                                  <button
                                    onClick={() => setMontoAbono(String(fiadoSeleccionado.saldoPendiente))}
                                    className="text-xs text-blue-600 mt-1 hover:underline"
                                  >
                                    Pagar todo ({formatCOP(fiadoSeleccionado.saldoPendiente)})
                                  </button>
                                </div>
                                <div>
                                  <Label>Medio de Pago</Label>
                                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                                    {medios.filter(m => m.nombre !== "Fiado").map((m) => (
                                      <button
                                        key={m.id}
                                        onClick={() => setMedioPagoAbono(m.id)}
                                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                                          medioPagoAbono === m.id
                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                      >
                                        {m.icono} {m.nombre}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <Button
                                  onClick={registrarAbono}
                                  disabled={guardandoAbono}
                                  className="w-full"
                                >
                                  {guardandoAbono ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                  Registrar Abono
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  );
                })}
                {data?.fiados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                      No hay fiados para el filtro seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

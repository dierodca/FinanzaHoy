"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  Loader2,
  TrendingUp,
  Receipt,
} from "lucide-react";
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
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatCOP, formatFecha, MEDIOS_PAGO_COLORES } from "@/lib/utils";

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precioVenta: number;
  stock: number;
}

interface ItemCarrito {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

interface Cliente {
  id: string;
  nombre: string;
}

interface MedioPago {
  id: string;
  nombre: string;
  icono?: string;
}

interface VentasData {
  ventas: Array<{
    id: string;
    total: number;
    cliente: string;
    medioPago: string;
    medioPagoIcono?: string;
    productos: string;
    fecha: string;
    items: number;
  }>;
  resumen: { totalVendido: number; ticketPromedio: number; transacciones: number };
}

export default function VentasPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [medios, setMedios] = useState<MedioPago[]>([]);
  const [ventas, setVentas] = useState<VentasData | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [buscarProducto, setBuscarProducto] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [medioPagoId, setMedioPagoId] = useState("");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [periodoVentas, setPeriodoVentas] = useState("hoy");
  const [openModal, setOpenModal] = useState(false);
  const [loadingVentas, setLoadingVentas] = useState(true);

  const cargarDatos = async () => {
    const [prodRes, cliRes, medRes] = await Promise.all([
      fetch("/api/productos").then((r) => r.json()),
      fetch("/api/clientes").then((r) => r.json()),
      fetch("/api/medios-pago").then((r) => r.json()),
    ]);
    setProductos(prodRes.productos ?? []);
    setClientes(cliRes.clientes ?? []);
    setMedios(medRes.medios ?? []);
    if (medRes.medios?.length > 0) setMedioPagoId(medRes.medios[0].id);
  };

  const cargarVentas = async () => {
    setLoadingVentas(true);
    const res = await fetch(`/api/ventas?periodo=${periodoVentas}`).then((r) => r.json());
    setVentas(res);
    setLoadingVentas(false);
  };

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { cargarVentas(); }, [periodoVentas]);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(buscarProducto.toLowerCase())
  );

  const agregarAlCarrito = (prod: Producto) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.productoId === prod.id);
      if (existe) {
        return prev.map((i) =>
          i.productoId === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        { productoId: prod.id, nombre: prod.nombre, cantidad: 1, precioUnitario: prod.precioVenta },
      ];
    });
  };

  const cambiarCantidad = (productoId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) => (i.productoId === productoId ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0)
    );
  };

  const total = carrito.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);

  const registrarVenta = async () => {
    if (carrito.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    if (!medioPagoId) {
      toast.error("Selecciona un medio de pago");
      return;
    }

    const mpNombre = medios.find((m) => m.id === medioPagoId)?.nombre;
    if (mpNombre === "Fiado" && !clienteId) {
      toast.error("Para registrar un fiado, selecciona el cliente");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteId || null,
          medioPagoId,
          nota,
          items: carrito.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al registrar venta");

      toast.success(`✅ Venta registrada — ${formatCOP(data.total)}`);
      setCarrito([]);
      setClienteId("");
      setNota("");
      setOpenModal(false);
      await cargarVentas();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Datos para gráfico de medios de pago
  const mediosData = ventas?.ventas
    ? Object.entries(
        ventas.ventas.reduce<Record<string, number>>((acc, v) => {
          acc[v.medioPago] = (acc[v.medioPago] ?? 0) + v.total;
          return acc;
        }, {})
      ).map(([nombre, value]) => ({ nombre, value }))
    : [];

  return (
    <div className="space-y-6 fade-in">
      {/* Controles superiores */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["hoy", "semana", "mes"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodoVentas(p)}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                periodoVentas === p
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
              Nueva Venta (POS)
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                Registrar Venta
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Catálogo */}
              <div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar producto..."
                    value={buscarProducto}
                    onChange={(e) => setBuscarProducto(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {productosFiltrados.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => agregarAlCarrito(prod)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{prod.nombre}</p>
                        <p className="text-xs text-gray-400">{prod.categoria}</p>
                      </div>
                      <p className="text-sm font-bold text-blue-600 ml-2">
                        {formatCOP(prod.precioVenta)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Carrito */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Carrito ({carrito.length} productos)
                </h4>
                <div className="space-y-2 min-h-[120px] max-h-48 overflow-y-auto pr-1">
                  {carrito.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Selecciona productos del catálogo
                    </p>
                  )}
                  {carrito.map((item) => (
                    <div
                      key={item.productoId}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{item.nombre}</p>
                        <p className="text-xs text-gray-500">{formatCOP(item.precioUnitario)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => cambiarCantidad(item.productoId, -1)}
                          className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-xs font-bold flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.cantidad}</span>
                        <button
                          onClick={() => cambiarCantidad(item.productoId, 1)}
                          className="w-6 h-6 rounded bg-blue-100 hover:bg-blue-200 text-xs font-bold flex items-center justify-center text-blue-700"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-xs font-bold text-gray-800 w-20 text-right">
                        {formatCOP(item.cantidad * item.precioUnitario)}
                      </p>
                      <button
                        onClick={() =>
                          setCarrito((p) => p.filter((i) => i.productoId !== item.productoId))
                        }
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Forma de pago y cliente */}
                <div className="mt-4 space-y-3">
                  <div>
                    <Label className="text-xs">Medio de pago</Label>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      {medios.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setMedioPagoId(m.id)}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                            medioPagoId === m.id
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {m.icono} {m.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Cliente (opcional)</Label>
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      className="w-full mt-1 h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Consumidor final</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-700">Total</span>
                    <span className="text-xl font-bold text-blue-700">{formatCOP(total)}</span>
                  </div>

                  <Button
                    onClick={registrarVenta}
                    disabled={guardando || carrito.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {guardando ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Receipt className="w-4 h-4 mr-2" />
                    )}
                    {guardando ? "Registrando..." : `Registrar Venta — ${formatCOP(total)}`}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs de ventas */}
      {ventas && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-xs text-gray-500">Total Vendido</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCOP(ventas.resumen.totalVendido)}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-xs text-gray-500">Ticket Promedio</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCOP(ventas.resumen.ticketPromedio)}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-xs text-gray-500">Transacciones</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {ventas.resumen.transacciones}
            </p>
          </div>
        </div>
      )}

      {/* Gráfico medios de pago + tabla de ventas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gráfico de dona — medios de pago */}
        {mediosData.length > 0 && (
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Medios de Pago</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mediosData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="nombre"
                >
                  {mediosData.map((entry, idx) => (
                    <Cell
                      key={entry.nombre}
                      fill={MEDIOS_PAGO_COLORES[entry.nombre] ?? `hsl(${idx * 60}, 70%, 55%)`}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCOP(v)} />
                <Legend
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabla de ventas recientes */}
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${mediosData.length > 0 ? "xl:col-span-2" : "xl:col-span-3"}`}>
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Ventas Recientes</h3>
          </div>
          {loadingVentas ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Productos</th>
                    <th className="px-4 py-3 text-left">Pago</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ventas?.ventas.slice(0, 15).map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatFecha(v.fecha, "dd/MM HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{v.cliente}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">
                        {v.productos}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{v.medioPagoIcono} {v.medioPago}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatCOP(v.total)}
                      </td>
                    </tr>
                  ))}
                  {(!ventas?.ventas || ventas.ventas.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No hay ventas para este período
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

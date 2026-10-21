"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Package, Loader2 } from "lucide-react";
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
import { formatCOP } from "@/lib/utils";

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  costoCompra: number;
  precioVenta: number;
  margen: string;
  stock: number;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    costoCompra: "",
    precioVenta: "",
    stock: "0",
    descripcion: "",
  });

  const cargar = async (q = "") => {
    setLoading(true);
    const res = await fetch(`/api/productos?buscar=${encodeURIComponent(q)}`).then((r) => r.json());
    setProductos(res.productos ?? []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    const t = setTimeout(() => cargar(buscar), 350);
    return () => clearTimeout(t);
  }, [buscar]);

  const registrarProducto = async () => {
    if (!form.nombre || !form.costoCompra || !form.precioVenta) {
      toast.error("Nombre, costo y precio son obligatorios");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          costoCompra: parseFloat(form.costoCompra),
          precioVenta: parseFloat(form.precioVenta),
          stock: parseInt(form.stock) || 0,
          descripcion: form.descripcion || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      toast.success("✅ Producto creado");
      setForm({ nombre: "", costoCompra: "", precioVenta: "", stock: "0", descripcion: "" });
      setOpenModal(false);
      await cargar(buscar);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const margenColor = (margen: string) => {
    const m = parseFloat(margen);
    if (m >= 30) return "text-green-700 bg-green-50";
    if (m >= 15) return "text-yellow-700 bg-yellow-50";
    return "text-red-700 bg-red-50";
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar producto..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="pl-9"
          />
        </div>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Crear Producto
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nombre del Producto *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Arroz Supremo 5kg"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Costo de Compra (COP) *</Label>
                  <Input
                    type="number"
                    value={form.costoCompra}
                    onChange={(e) => setForm((f) => ({ ...f, costoCompra: e.target.value }))}
                    placeholder="14000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Precio de Venta (COP) *</Label>
                  <Input
                    type="number"
                    value={form.precioVenta}
                    onChange={(e) => setForm((f) => ({ ...f, precioVenta: e.target.value }))}
                    placeholder="18000"
                    className="mt-1"
                  />
                </div>
              </div>
              {/* Vista previa del margen */}
              {form.costoCompra && form.precioVenta && parseFloat(form.precioVenta) > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  Margen:{" "}
                  <strong className="text-blue-700">
                    {(((parseFloat(form.precioVenta) - parseFloat(form.costoCompra)) / parseFloat(form.precioVenta)) * 100).toFixed(1)}%
                  </strong>
                  {" · "}Ganancia por unidad:{" "}
                  <strong className="text-green-700">
                    {formatCOP(parseFloat(form.precioVenta) - parseFloat(form.costoCompra))}
                  </strong>
                </div>
              )}
              <div>
                <Label>Stock inicial</Label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <Button onClick={registrarProducto} disabled={guardando} className="w-full">
                {guardando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Crear Producto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            Catálogo de Productos
            <span className="text-gray-400 font-normal ml-2 text-sm">({productos.length})</span>
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
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-right">Costo</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-center">Margen</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{p.nombre}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.categoria}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {formatCOP(p.costoCompra)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {formatCOP(p.precioVenta)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${margenColor(p.margen)}`}>
                        {p.margen}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold ${p.stock <= 5 ? "text-red-600" : "text-gray-700"}`}>
                        {p.stock}
                      </span>
                    </td>
                  </tr>
                ))}
                {productos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                      No se encontraron productos
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

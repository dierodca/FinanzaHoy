"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
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

interface CategoriaProducto {
  id: string;
  nombre: string;
}

const FORM_VACIO = {
  nombre: "",
  costoCompra: "",
  precioVenta: "",
  stock: "0",
  descripcion: "",
  categoriaId: "",
};

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState("");

  // Modal crear
  const [openCrear, setOpenCrear] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);

  // Modal editar
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [formEditar, setFormEditar] = useState(FORM_VACIO);
  const [guardandoEditar, setGuardandoEditar] = useState(false);

  // Modal confirmar eliminar
  const [productoEliminar, setProductoEliminar] = useState<Producto | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = async (q = "") => {
    setLoading(true);
    const res = await fetch(`/api/productos?buscar=${encodeURIComponent(q)}`).then((r) => r.json());
    setProductos(res.productos ?? []);
    setLoading(false);
  };

  const cargarCategorias = async () => {
    // Reutilizamos el endpoint de gastos para obtener categorías de producto
    // Las categorías vienen de la lista de productos
    const res = await fetch("/api/productos").then((r) => r.json());
    // Extraer categorías únicas
    const cats = Array.from(
      new Map(
        (res.productos ?? [])
          .filter((p: Producto) => p.categoria !== "Sin categoría")
          .map((p: Producto) => [p.categoria, { id: p.categoria, nombre: p.categoria }])
      ).values()
    ) as CategoriaProducto[];
    setCategorias(cats);
  };

  useEffect(() => {
    cargar();
    cargarCategorias();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => cargar(buscar), 350);
    return () => clearTimeout(t);
  }, [buscar]);

  // ── Crear ────────────────────────────────────────────────────
  const crearProducto = async () => {
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
      setForm(FORM_VACIO);
      setOpenCrear(false);
      await cargar(buscar);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Abrir modal editar ───────────────────────────────────────
  const abrirEditar = (p: Producto) => {
    setProductoEditando(p);
    setFormEditar({
      nombre: p.nombre,
      costoCompra: String(p.costoCompra),
      precioVenta: String(p.precioVenta),
      stock: String(p.stock),
      descripcion: "",
      categoriaId: "",
    });
  };

  // ── Guardar edición ──────────────────────────────────────────
  const guardarEdicion = async () => {
    if (!productoEditando) return;
    if (!formEditar.nombre || !formEditar.costoCompra || !formEditar.precioVenta) {
      toast.error("Nombre, costo y precio son obligatorios");
      return;
    }
    setGuardandoEditar(true);
    try {
      const res = await fetch(`/api/productos/${productoEditando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formEditar.nombre,
          costoCompra: parseFloat(formEditar.costoCompra),
          precioVenta: parseFloat(formEditar.precioVenta),
          stock: parseInt(formEditar.stock) || 0,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      toast.success("✅ Producto actualizado");
      setProductoEditando(null);
      await cargar(buscar);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGuardandoEditar(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────
  const eliminarProducto = async () => {
    if (!productoEliminar) return;
    setEliminando(true);
    try {
      const res = await fetch(`/api/productos/${productoEliminar.id}`, {
        method: "DELETE",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      toast.success(`🗑️ "${productoEliminar.nombre}" eliminado`);
      setProductoEliminar(null);
      await cargar(buscar);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEliminando(false);
    }
  };

  const margenColor = (margen: string) => {
    const m = parseFloat(margen);
    if (m >= 30) return "text-green-700 bg-green-50";
    if (m >= 15) return "text-yellow-700 bg-yellow-50";
    return "text-red-700 bg-red-50";
  };

  const margenPreview = (costo: string, precio: string) => {
    const c = parseFloat(costo);
    const p = parseFloat(precio);
    if (!c || !p || p <= 0) return null;
    return (((p - c) / p) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Barra superior */}
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

        {/* Modal CREAR */}
        <Dialog open={openCrear} onOpenChange={setOpenCrear}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Producto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nombre *</Label>
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
              {margenPreview(form.costoCompra, form.precioVenta) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  Margen:{" "}
                  <strong className="text-blue-700">
                    {margenPreview(form.costoCompra, form.precioVenta)}%
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
              <Button onClick={crearProducto} disabled={guardando} className="w-full">
                {guardando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {guardando ? "Creando..." : "Crear Producto"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla */}
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
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.categoria}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCOP(p.costoCompra)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCOP(p.precioVenta)}</td>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* Botón Editar */}
                        <button
                          onClick={() => abrirEditar(p)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar producto"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* Botón Eliminar */}
                        <button
                          onClick={() => setProductoEliminar(p)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {productos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                      No se encontraron productos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal EDITAR */}
      <Dialog open={!!productoEditando} onOpenChange={(open) => { if (!open) setProductoEditando(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-600" />
              Editar Producto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={formEditar.nombre}
                onChange={(e) => setFormEditar((f) => ({ ...f, nombre: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Costo de Compra (COP) *</Label>
                <Input
                  type="number"
                  value={formEditar.costoCompra}
                  onChange={(e) => setFormEditar((f) => ({ ...f, costoCompra: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Precio de Venta (COP) *</Label>
                <Input
                  type="number"
                  value={formEditar.precioVenta}
                  onChange={(e) => setFormEditar((f) => ({ ...f, precioVenta: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            {margenPreview(formEditar.costoCompra, formEditar.precioVenta) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                Margen:{" "}
                <strong className="text-blue-700">
                  {margenPreview(formEditar.costoCompra, formEditar.precioVenta)}%
                </strong>
                {" · "}Ganancia:{" "}
                <strong className="text-green-700">
                  {formatCOP(parseFloat(formEditar.precioVenta || "0") - parseFloat(formEditar.costoCompra || "0"))}
                </strong>
              </div>
            )}
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={formEditar.stock}
                onChange={(e) => setFormEditar((f) => ({ ...f, stock: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setProductoEditando(null)}
              >
                Cancelar
              </Button>
              <Button onClick={guardarEdicion} disabled={guardandoEditar} className="flex-1">
                {guardandoEditar && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {guardandoEditar ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal CONFIRMAR ELIMINAR */}
      <Dialog open={!!productoEliminar} onOpenChange={(open) => { if (!open) setProductoEliminar(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminar Producto
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                ¿Estás seguro de que quieres eliminar{" "}
                <strong className="text-gray-900">"{productoEliminar?.nombre}"</strong>?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                El producto se desactivará y no aparecerá en el catálogo ni en el POS. El historial de ventas se conserva.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setProductoEliminar(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={eliminarProducto}
                disabled={eliminando}
              >
                {eliminando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

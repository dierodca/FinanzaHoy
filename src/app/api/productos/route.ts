export const dynamic = "force-dynamic";
// app/api/productos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const NEGOCIO_ID = process.env.DEMO_NEGOCIO_ID ?? "negocio-demo-001";

const ProductoSchema = z.object({
  nombre: z.string().min(2),
  categoriaId: z.string().optional().nullable(),
  costoCompra: z.number().positive(),
  precioVenta: z.number().positive(),
  stock: z.number().int().min(0).optional(),
  descripcion: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buscar = searchParams.get("buscar") ?? "";

  const productos = await prisma.producto.findMany({
    where: {
      negocioId: NEGOCIO_ID,
      activo: true,
      nombre: buscar ? { contains: buscar, mode: "insensitive" } : undefined,
    },
    include: { categoria: { select: { nombre: true } } },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({
    productos: productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria?.nombre ?? "Sin categoría",
      costoCompra: Number(p.costoCompra),
      precioVenta: Number(p.precioVenta),
      margen: (((Number(p.precioVenta) - Number(p.costoCompra)) / Number(p.precioVenta)) * 100).toFixed(1),
      stock: p.stock,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ProductoSchema.parse(body);

    const producto = await prisma.producto.create({
      data: {
        negocioId: NEGOCIO_ID,
        nombre: data.nombre,
        categoriaId: data.categoriaId ?? null,
        costoCompra: data.costoCompra,
        precioVenta: data.precioVenta,
        stock: data.stock ?? 0,
        descripcion: data.descripcion,
      },
    });

    return NextResponse.json(
      { message: "Producto creado", productoId: producto.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
// app/api/productos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ProductoSchema = z.object({
  nombre: z.string().min(2),
  categoriaId: z.string().optional().nullable(),
  costoCompra: z.number().positive(),
  precioVenta: z.number().positive(),
  stock: z.number().int().min(0).optional(),
  descripcion: z.string().optional(),
});

// PUT — actualizar producto
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const data = ProductoSchema.parse(body);

    const producto = await prisma.producto.update({
      where: { id: params.id },
      data: {
        nombre: data.nombre,
        categoriaId: data.categoriaId ?? null,
        costoCompra: data.costoCompra,
        precioVenta: data.precioVenta,
        stock: data.stock ?? 0,
        descripcion: data.descripcion,
      },
    });

    return NextResponse.json({
      message: "Producto actualizado",
      producto: { id: producto.id, nombre: producto.nombre },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

// DELETE — borrado lógico (activo = false)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.producto.update({
      where: { id: params.id },
      data: { activo: false },
    });

    return NextResponse.json({ message: "Producto eliminado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
// app/api/categorias-producto/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categorias = await prisma.categoriaProducto.findMany({
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json({ categorias });
}

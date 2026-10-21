export const dynamic = "force-dynamic";
// app/api/clientes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const NEGOCIO_ID = process.env.DEMO_NEGOCIO_ID ?? "negocio-demo-001";

const ClienteSchema = z.object({
  nombreCompleto: z.string().min(2),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const buscar = searchParams.get("buscar") ?? "";

  const clientes = await prisma.cliente.findMany({
    where: {
      negocioId: NEGOCIO_ID,
      activo: true,
      nombreCompleto: buscar ? { contains: buscar, mode: "insensitive" } : undefined,
    },
    orderBy: { nombreCompleto: "asc" },
    take: 50,
  });

  return NextResponse.json({
    clientes: clientes.map((c) => ({
      id: c.id,
      nombre: c.nombreCompleto,
      telefono: c.telefono,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ClienteSchema.parse(body);

    const cliente = await prisma.cliente.create({
      data: {
        negocioId: NEGOCIO_ID,
        nombreCompleto: data.nombreCompleto,
        telefono: data.telefono,
        direccion: data.direccion,
      },
    });

    return NextResponse.json(
      { message: "Cliente creado", clienteId: cliente.id, nombre: cliente.nombreCompleto },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}

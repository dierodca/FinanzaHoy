export const dynamic = "force-dynamic";
// app/api/gastos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfDay, endOfDay, subDays } from "date-fns";

const NEGOCIO_ID = process.env.DEMO_NEGOCIO_ID ?? "negocio-demo-001";

const GastoSchema = z.object({
  categoriaId: z.string(),
  concepto: z.string().min(2, "El concepto debe tener al menos 2 caracteres"),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  fecha: z.string().optional(),
  nota: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periodo = searchParams.get("periodo") ?? "mes";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  let dateFilter: { gte?: Date; lte?: Date } = {};
  switch (periodo) {
    case "hoy":
      dateFilter = { gte: startOfDay(new Date()), lte: endOfDay(new Date()) };
      break;
    case "semana":
      dateFilter = { gte: startOfDay(subDays(new Date(), 7)) };
      break;
    case "mes":
      dateFilter = { gte: startOfDay(subDays(new Date(), 30)) };
      break;
  }

  try {
    const [gastos, total, categorias] = await Promise.all([
      prisma.gasto.findMany({
        where: { negocioId: NEGOCIO_ID, fecha: dateFilter },
        include: {
          categoria: { select: { nombre: true, color: true, icono: true } },
        },
        orderBy: { fecha: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.gasto.count({ where: { negocioId: NEGOCIO_ID, fecha: dateFilter } }),
      prisma.categoriaGasto.findMany(),
    ]);

    // Totales por categoría
    const porCategoria = gastos.reduce<Record<string, { total: number; nombre: string; color: string; icono: string }>>((acc, g) => {
      const key = g.categoriaId;
      if (!acc[key]) {
        acc[key] = {
          total: 0,
          nombre: g.categoria.nombre,
          color: g.categoria.color ?? "#6b7280",
          icono: g.categoria.icono ?? "📦",
        };
      }
      acc[key].total += Number(g.monto);
      return acc;
    }, {});

    const totalGastos = gastos.reduce((s, g) => s + Number(g.monto), 0);

    return NextResponse.json({
      gastos: gastos.map((g) => ({
        id: g.id,
        concepto: g.concepto,
        monto: Number(g.monto),
        fecha: g.fecha,
        categoria: g.categoria.nombre,
        categoriaColor: g.categoria.color,
        categoriaIcono: g.categoria.icono,
        nota: g.nota,
      })),
      resumen: {
        totalGastos,
        registros: total,
        porCategoria: Object.values(porCategoria).sort((a, b) => b.total - a.total),
      },
      categorias: categorias.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        color: c.color,
        icono: c.icono,
      })),
      pagination: { page, limit, total },
    });
  } catch (error) {
    console.error("Error GET /api/gastos:", error);
    return NextResponse.json({ error: "Error al obtener gastos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = GastoSchema.parse(body);

    const usuario = await prisma.usuario.findFirst({
      where: { negocioId: NEGOCIO_ID },
    });
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
    }

    const gasto = await prisma.gasto.create({
      data: {
        negocioId: NEGOCIO_ID,
        usuarioId: usuario.id,
        categoriaId: data.categoriaId,
        concepto: data.concepto,
        monto: data.monto,
        fecha: data.fecha ? new Date(data.fecha) : new Date(),
        nota: data.nota,
      },
      include: { categoria: true },
    });

    return NextResponse.json(
      {
        message: "Gasto registrado",
        gasto: { id: gasto.id, concepto: gasto.concepto, monto: Number(gasto.monto) },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    console.error("Error POST /api/gastos:", error);
    return NextResponse.json({ error: "Error al registrar gasto" }, { status: 500 });
  }
}

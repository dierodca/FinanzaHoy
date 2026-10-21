export const dynamic = "force-dynamic";
// app/api/cartera/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { differenceInDays } from "date-fns";

const NEGOCIO_ID = process.env.DEMO_NEGOCIO_ID ?? "negocio-demo-001";

function getSemaforo(dias: number): "verde" | "amarillo" | "rojo" {
  if (dias <= 7) return "verde";
  if (dias <= 15) return "amarillo";
  return "rojo";
}

const FiadoSchema = z.object({
  clienteId: z.string(),
  montoOriginal: z.number().positive(),
  nota: z.string().optional(),
});

const AbonoSchema = z.object({
  fiadoId: z.string(),
  medioPagoId: z.string(),
  monto: z.number().positive(),
  nota: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const semaforo = searchParams.get("semaforo"); // verde | amarillo | rojo | all
  const buscar = searchParams.get("buscar") ?? "";

  try {
    const fiados = await prisma.fiado.findMany({
      where: {
        negocioId: NEGOCIO_ID,
        estado: { in: ["PENDIENTE", "ABONADO"] },
        cliente: buscar
          ? { nombreCompleto: { contains: buscar, mode: "insensitive" } }
          : undefined,
      },
      include: {
        cliente: { select: { id: true, nombreCompleto: true, telefono: true } },
        abonos: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { medioPago: { select: { nombre: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const fiadosConSemaforo = fiados
      .map((f) => {
        const dias = differenceInDays(new Date(), new Date(f.createdAt));
        const color = getSemaforo(dias);
        return {
          id: f.id,
          clienteId: f.cliente.id,
          cliente: f.cliente.nombreCompleto,
          telefono: f.cliente.telefono,
          montoOriginal: Number(f.montoOriginal),
          saldoPendiente: Number(f.saldoPendiente),
          dias,
          semaforo: color,
          fechaCreacion: f.createdAt,
          ultimaCompra: f.createdAt,
          estado: f.estado,
          abonos: f.abonos.map((a) => ({
            monto: Number(a.monto),
            medioPago: a.medioPago.nombre,
            fecha: a.createdAt,
          })),
        };
      })
      .filter((f) => {
        if (!semaforo || semaforo === "all") return true;
        return f.semaforo === semaforo;
      })
      .sort((a, b) => b.dias - a.dias);

    const resumen = {
      totalCartera: fiadosConSemaforo.reduce((s, f) => s + f.saldoPendiente, 0),
      deudaPromedio:
        fiadosConSemaforo.length > 0
          ? fiadosConSemaforo.reduce((s, f) => s + f.saldoPendiente, 0) /
            fiadosConSemaforo.length
          : 0,
      mayorDeuda: fiadosConSemaforo[0]
        ? { monto: fiadosConSemaforo[0].saldoPendiente, cliente: fiadosConSemaforo[0].cliente }
        : null,
      porSemaforo: {
        verde: fiadosConSemaforo.filter((f) => f.semaforo === "verde").length,
        amarillo: fiadosConSemaforo.filter((f) => f.semaforo === "amarillo").length,
        rojo: fiadosConSemaforo.filter((f) => f.semaforo === "rojo").length,
      },
    };

    return NextResponse.json({ fiados: fiadosConSemaforo, resumen });
  } catch (error) {
    console.error("Error GET /api/cartera:", error);
    return NextResponse.json({ error: "Error al obtener cartera" }, { status: 500 });
  }
}

// POST — registrar nuevo fiado directo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = FiadoSchema.parse(body);

    const fiado = await prisma.fiado.create({
      data: {
        negocioId: NEGOCIO_ID,
        clienteId: data.clienteId,
        montoOriginal: data.montoOriginal,
        saldoPendiente: data.montoOriginal,
        nota: data.nota,
        fechaVencimiento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
      include: { cliente: true },
    });

    return NextResponse.json(
      {
        message: "Fiado registrado",
        fiadoId: fiado.id,
        cliente: fiado.cliente.nombreCompleto,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    console.error("Error POST /api/cartera:", error);
    return NextResponse.json({ error: "Error al registrar fiado" }, { status: 500 });
  }
}

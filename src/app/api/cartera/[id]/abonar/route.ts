// app/api/cartera/[id]/abonar/route.ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const NEGOCIO_ID = process.env.DEMO_NEGOCIO_ID ?? "negocio-demo-001";

const AbonoSchema = z.object({
  medioPagoId: z.string(),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  nota: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const data = AbonoSchema.parse(body);
    const fiadoId = params.id;

    const fiado = await prisma.fiado.findUnique({ where: { id: fiadoId } });
    if (!fiado) {
      return NextResponse.json({ error: "Fiado no encontrado" }, { status: 404 });
    }

    if (data.monto > Number(fiado.saldoPendiente)) {
      return NextResponse.json(
        { error: `El abono no puede superar el saldo pendiente de $${fiado.saldoPendiente}` },
        { status: 422 }
      );
    }

    const usuario = await prisma.usuario.findFirst({
      where: { negocioId: NEGOCIO_ID },
    });
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
    }

    const nuevoSaldo = Number(fiado.saldoPendiente) - data.monto;
    const nuevoEstado = nuevoSaldo === 0 ? "PAGADO" : "ABONADO";

    const [abono] = await prisma.$transaction([
      prisma.abonoFiado.create({
        data: {
          fiadoId,
          usuarioId: usuario.id,
          medioPagoId: data.medioPagoId,
          monto: data.monto,
          nota: data.nota,
        },
      }),
      prisma.fiado.update({
        where: { id: fiadoId },
        data: {
          saldoPendiente: nuevoSaldo,
          estado: nuevoEstado,
        },
      }),
    ]);

    return NextResponse.json({
      message: nuevoEstado === "PAGADO" ? "Fiado cancelado. ¡Cuenta a paz y salvo!" : "Abono registrado",
      abonoId: abono.id,
      nuevoSaldo,
      estado: nuevoEstado,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    console.error("Error POST /api/cartera/[id]/abonar:", error);
    return NextResponse.json({ error: "Error al registrar abono" }, { status: 500 });
  }
}

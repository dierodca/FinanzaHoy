export const dynamic = "force-dynamic";
// app/api/ventas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfDay, endOfDay, subDays } from "date-fns";

const NEGOCIO_ID = process.env.DEMO_NEGOCIO_ID ?? "negocio-demo-001";

const VentaSchema = z.object({
  clienteId: z.string().optional().nullable(),
  medioPagoId: z.string(),
  nota: z.string().optional(),
  items: z
    .array(
      z.object({
        productoId: z.string(),
        cantidad: z.number().int().positive(),
        precioUnitario: z.number().positive(),
      })
    )
    .min(1, "Debe incluir al menos un producto"),
});

// GET — listar ventas con filtros
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const periodo = searchParams.get("periodo") ?? "hoy";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  let dateFilter: { gte?: Date; lte?: Date } = {};

  if (desde && hasta) {
    dateFilter = { gte: new Date(desde), lte: endOfDay(new Date(hasta)) };
  } else {
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
  }

  try {
    const [ventas, total] = await Promise.all([
      prisma.venta.findMany({
        where: {
          negocioId: NEGOCIO_ID,
          estado: "COMPLETADA",
          createdAt: dateFilter,
        },
        include: {
          cliente: { select: { nombreCompleto: true } },
          medioPago: { select: { nombre: true, icono: true } },
          detalles: {
            include: { producto: { select: { nombre: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.venta.count({
        where: {
          negocioId: NEGOCIO_ID,
          estado: "COMPLETADA",
          createdAt: dateFilter,
        },
      }),
    ]);

    const totalVendido = ventas.reduce((s, v) => s + Number(v.total), 0);
    const ticketPromedio = ventas.length > 0 ? totalVendido / ventas.length : 0;

    return NextResponse.json({
      ventas: ventas.map((v) => ({
        id: v.id,
        total: Number(v.total),
        cliente: v.cliente?.nombreCompleto ?? "Consumidor final",
        medioPago: v.medioPago.nombre,
        medioPagoIcono: v.medioPago.icono,
        items: v.detalles.length,
        productos: v.detalles.map((d) => d.producto.nombre).join(", "),
        fecha: v.createdAt,
        estado: v.estado,
      })),
      resumen: {
        totalVendido,
        ticketPromedio,
        transacciones: total,
      },
      pagination: { page, limit, total },
    });
  } catch (error) {
    console.error("Error GET /api/ventas:", error);
    return NextResponse.json({ error: "Error al obtener ventas" }, { status: 500 });
  }
}

// POST — registrar nueva venta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = VentaSchema.parse(body);

    const subtotal = data.items.reduce(
      (s, i) => s + i.cantidad * i.precioUnitario,
      0
    );

    // Obtener usuario admin (demo)
    const usuario = await prisma.usuario.findFirst({
      where: { negocioId: NEGOCIO_ID },
    });
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 400 });
    }

    // Si el medio de pago es "Fiado", se crea el fiado automáticamente
    const medioPago = await prisma.medioPago.findUnique({
      where: { id: data.medioPagoId },
    });

    const venta = await prisma.$transaction(async (tx) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          negocioId: NEGOCIO_ID,
          usuarioId: usuario.id,
          clienteId: data.clienteId ?? null,
          medioPagoId: data.medioPagoId,
          subtotal,
          total: subtotal,
          nota: data.nota,
          detalles: {
            create: data.items.map((i) => ({
              productoId: i.productoId,
              cantidad: i.cantidad,
              precioUnitario: i.precioUnitario,
              subtotal: i.cantidad * i.precioUnitario,
            })),
          },
        },
        include: { medioPago: true, detalles: true },
      });

      // Si es fiado, crear registro en cartera
      if (medioPago?.nombre === "Fiado" && data.clienteId) {
        await tx.fiado.create({
          data: {
            negocioId: NEGOCIO_ID,
            clienteId: data.clienteId,
            ventaId: nuevaVenta.id,
            montoOriginal: subtotal,
            saldoPendiente: subtotal,
            fechaVencimiento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return nuevaVenta;
    });

    return NextResponse.json(
      { message: "Venta registrada", ventaId: venta.id, total: Number(venta.total) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    console.error("Error POST /api/ventas:", error);
    return NextResponse.json({ error: "Error al registrar venta" }, { status: 500 });
  }
}

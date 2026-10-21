export const dynamic = "force-dynamic";
// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, startOfWeek, format } from "date-fns";

const NEGOCIO_ID = process.env.DEMO_NEGOCIO_ID ?? "negocio-demo-001";

export async function GET() {
  try {
    const hoy = new Date();
    const inicioDia = startOfDay(hoy);
    const finDia = endOfDay(hoy);
    const inicioSemana = startOfWeek(hoy, { weekStartsOn: 1 });
    const ayer = startOfDay(subDays(hoy, 1));
    const finAyer = endOfDay(subDays(hoy, 1));

    // ── Ventas de hoy ──────────────────────────────────────────
    const ventasHoy = await prisma.venta.findMany({
      where: {
        negocioId: NEGOCIO_ID,
        estado: "COMPLETADA",
        createdAt: { gte: inicioDia, lte: finDia },
      },
      include: { medioPago: true },
    });
    const totalVentasHoy = ventasHoy.reduce((s, v) => s + Number(v.total), 0);

    // ── Ventas de ayer ─────────────────────────────────────────
    const ventasAyer = await prisma.venta.findMany({
      where: {
        negocioId: NEGOCIO_ID,
        estado: "COMPLETADA",
        createdAt: { gte: ayer, lte: finAyer },
      },
    });
    const totalVentasAyer = ventasAyer.reduce((s, v) => s + Number(v.total), 0);

    // ── Gastos de hoy ─────────────────────────────────────────
    const gastosHoy = await prisma.gasto.findMany({
      where: {
        negocioId: NEGOCIO_ID,
        fecha: { gte: inicioDia, lte: finDia },
      },
    });
    const totalGastosHoy = gastosHoy.reduce((s, g) => s + Number(g.monto), 0);

    // ── Ganancia neta ─────────────────────────────────────────
    const gananciaNeta = totalVentasHoy - totalGastosHoy;

    // ── Cartera vencida (>15 días) ────────────────────────────
    const fiadosVencidos = await prisma.fiado.findMany({
      where: {
        negocioId: NEGOCIO_ID,
        estado: { in: ["PENDIENTE", "ABONADO"] },
        createdAt: { lt: subDays(hoy, 15) },
      },
    });
    const totalCarteraVencida = fiadosVencidos.reduce(
      (s, f) => s + Number(f.saldoPendiente),
      0
    );

    // ── Ventas por día (últimos 7 días) usando Prisma ORM ─────
    const ventasSemanaRaw = await prisma.venta.findMany({
      where: {
        negocioId: NEGOCIO_ID,
        estado: "COMPLETADA",
        createdAt: { gte: inicioSemana },
      },
      select: { createdAt: true, total: true },
    });

    // Agrupar por día en memoria
    const ventasPorDia = ventasSemanaRaw.reduce<Record<string, number>>((acc, v) => {
      const dia = format(new Date(v.createdAt), "yyyy-MM-dd");
      acc[dia] = (acc[dia] ?? 0) + Number(v.total);
      return acc;
    }, {});

    const ventasSemana = Object.entries(ventasPorDia)
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => a.dia.localeCompare(b.dia));

    // ── Top 5 productos (últimos 7 días) usando Prisma ORM ────
    const detalles7dias = await prisma.detalleVenta.findMany({
      where: {
        venta: {
          negocioId: NEGOCIO_ID,
          estado: "COMPLETADA",
          createdAt: { gte: startOfDay(subDays(hoy, 7)) },
        },
      },
      include: { producto: { select: { nombre: true } } },
    });

    const topProductosMap = detalles7dias.reduce<
      Record<string, { nombre: string; total: number; unidades: number }>
    >((acc, d) => {
      const key = d.productoId;
      if (!acc[key]) {
        acc[key] = { nombre: d.producto.nombre, total: 0, unidades: 0 };
      }
      acc[key].total += Number(d.subtotal);
      acc[key].unidades += d.cantidad;
      return acc;
    }, {});

    const topProductos = Object.values(topProductosMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // ── Arqueo de caja ─────────────────────────────────────────
    const arqueoHoy = await prisma.arqueoCaja.findFirst({
      where: {
        negocioId: NEGOCIO_ID,
        fecha: { gte: inicioDia },
      },
      include: {
        detalles: { include: { medioPago: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Desglose por medio de pago de hoy
    const desgloseMedios = ventasHoy.reduce<Record<string, number>>((acc, v) => {
      const nombre = v.medioPago.nombre;
      acc[nombre] = (acc[nombre] ?? 0) + Number(v.total);
      return acc;
    }, {});

    // ── Meta del mes ──────────────────────────────────────────
    const periodo = format(hoy, "yyyy-MM");
    const meta = await prisma.metaVenta.findUnique({
      where: { negocioId_periodo: { negocioId: NEGOCIO_ID, periodo } },
    });

    return NextResponse.json({
      kpis: {
        gananciaNeta,
        totalVentasHoy,
        totalVentasAyer,
        totalGastosHoy,
        totalCarteraVencida,
        clientesVencidos: fiadosVencidos.length,
        transaccionesHoy: ventasHoy.length,
        metaMes: meta ? Number(meta.montoMeta) : 5000000,
      },
      ventasSemana,
      topProductos,
      arqueoHoy: arqueoHoy
        ? {
            montoEsperado: Number(arqueoHoy.montoEsperado),
            montoFisico: Number(arqueoHoy.montoFisico),
            diferencia: Number(arqueoHoy.diferencia),
            detalles: arqueoHoy.detalles.map((d) => ({
              medioPago: d.medioPago.nombre,
              monto: Number(d.monto),
            })),
          }
        : null,
      desgloseMediosHoy: desgloseMedios,
    });
  } catch (error) {
    console.error("Error en /api/dashboard:", error);
    return NextResponse.json(
      { error: "Error al obtener datos del dashboard", detail: String(error) },
      { status: 500 }
    );
  }
}

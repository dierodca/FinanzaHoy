export const dynamic = "force-dynamic";
// app/api/dashboard/route.ts
// Datos consolidados para el Dashboard principal

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, startOfWeek } from "date-fns";

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

    // ── Ventas de ayer (para comparación) ─────────────────────
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

    // ── Cartera vencida (semáforo rojo: >15 días) ─────────────
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

    // ── Ventas por día (últimos 7 días) ───────────────────────
    const ventasSemana = await prisma.$queryRaw<
      Array<{ dia: string; total: number }>
    >`
      SELECT 
        DATE(created_at) as dia,
        SUM(total)::float as total
      FROM ventas
      WHERE negocio_id = ${NEGOCIO_ID}
        AND estado = 'COMPLETADA'
        AND created_at >= ${inicioSemana}
      GROUP BY DATE(created_at)
      ORDER BY dia ASC
    `;

    // ── Top 5 productos ───────────────────────────────────────
    const topProductos = await prisma.$queryRaw<
      Array<{ nombre: string; total: number; unidades: number }>
    >`
      SELECT 
        p.nombre,
        SUM(dv.subtotal)::float as total,
        SUM(dv.cantidad)::int as unidades
      FROM detalle_ventas dv
      JOIN productos p ON p.id = dv.producto_id
      JOIN ventas v ON v.id = dv.venta_id
      WHERE v.negocio_id = ${NEGOCIO_ID}
        AND v.estado = 'COMPLETADA'
        AND v.created_at >= ${startOfDay(subDays(hoy, 7))}
      GROUP BY p.id, p.nombre
      ORDER BY total DESC
      LIMIT 5
    `;

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

    // Calcular desglose por medio de pago de hoy
    const desgloseMedios = ventasHoy.reduce<Record<string, number>>(
      (acc, v) => {
        const nombre = v.medioPago.nombre;
        acc[nombre] = (acc[nombre] ?? 0) + Number(v.total);
        return acc;
      },
      {}
    );

    // ── Meta del mes ──────────────────────────────────────────
    const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
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
      { error: "Error al obtener datos del dashboard" },
      { status: 500 }
    );
  }
}

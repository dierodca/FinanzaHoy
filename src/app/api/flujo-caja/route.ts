export const dynamic = "force-dynamic";
// app/api/flujo-caja/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";

const NEGOCIO_ID = process.env.DEMO_NEGOCIO_ID ?? "negocio-demo-001";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periodo = searchParams.get("periodo") ?? "mes";

  let fechaInicio: Date;
  let fechaFin = new Date();

  switch (periodo) {
    case "hoy":
      fechaInicio = startOfDay(new Date());
      break;
    case "semana":
      fechaInicio = startOfDay(subDays(new Date(), 7));
      break;
    case "trimestre":
      fechaInicio = startOfDay(subDays(new Date(), 90));
      break;
    case "mes":
    default:
      fechaInicio = startOfMonth(new Date());
      fechaFin = endOfMonth(new Date());
      break;
  }

  try {
    const [ventas, gastos] = await Promise.all([
      prisma.venta.findMany({
        where: {
          negocioId: NEGOCIO_ID,
          estado: "COMPLETADA",
          createdAt: { gte: fechaInicio, lte: fechaFin },
        },
        select: { total: true, medioPagoId: true, createdAt: true, medioPago: { select: { nombre: true } } },
      }),
      prisma.gasto.findMany({
        where: {
          negocioId: NEGOCIO_ID,
          fecha: { gte: fechaInicio, lte: fechaFin },
        },
        include: { categoria: { select: { nombre: true, color: true } } },
      }),
    ]);

    const totalIngresos = ventas.reduce((s, v) => s + Number(v.total), 0);
    const totalEgresos = gastos.reduce((s, g) => s + Number(g.monto), 0);
    const flujoNeto = totalIngresos - totalEgresos;
    const margen = totalIngresos > 0 ? (flujoNeto / totalIngresos) * 100 : 0;

    // Distribución de egresos por categoría
    const egresosCategoria = gastos.reduce<
      Record<string, { nombre: string; total: number; color: string }>
    >((acc, g) => {
      const key = g.categoriaId;
      if (!acc[key]) {
        acc[key] = { nombre: g.categoria.nombre, total: 0, color: g.categoria.color ?? "#6b7280" };
      }
      acc[key].total += Number(g.monto);
      return acc;
    }, {});

    // Ingresos por medio de pago
    const ingresosMedio = ventas.reduce<Record<string, number>>((acc, v) => {
      const nombre = v.medioPago.nombre;
      acc[nombre] = (acc[nombre] ?? 0) + Number(v.total);
      return acc;
    }, {});

    // Ingresos vs Egresos por semana (agrupados)
    const semanas: Array<{ semana: string; ingresos: number; egresos: number; flujo: number }> = [];
    for (let s = 0; s < 5; s++) {
      const inicio = startOfDay(subDays(new Date(), 28 - s * 7));
      const fin = startOfDay(subDays(new Date(), 21 - s * 7));
      const ingSem = ventas
        .filter((v) => new Date(v.createdAt) >= inicio && new Date(v.createdAt) < fin)
        .reduce((sum, v) => sum + Number(v.total), 0);
      const egSem = gastos
        .filter((g) => new Date(g.fecha) >= inicio && new Date(g.fecha) < fin)
        .reduce((sum, g) => sum + Number(g.monto), 0);
      semanas.push({
        semana: `Sem ${s + 1}`,
        ingresos: ingSem,
        egresos: egSem,
        flujo: ingSem - egSem,
      });
    }

    // Top egresos
    const topEgresos = [...gastos]
      .sort((a, b) => Number(b.monto) - Number(a.monto))
      .slice(0, 10)
      .map((g) => ({
        fecha: g.fecha,
        categoria: g.categoria.nombre,
        concepto: g.concepto,
        monto: Number(g.monto),
      }));

    // Proyección 30 días
    const diasEnPeriodo = Math.max(
      1,
      Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24))
    );
    const superavitDiario = flujoNeto / diasEnPeriodo;
    const ingresosDiario = totalIngresos / diasEnPeriodo;
    const egresosDiario = totalEgresos / diasEnPeriodo;

    const proyeccion = {
      dias: 30,
      superavitDiario,
      tendenciaActual: superavitDiario * 30,
      escenarioAlerta: (ingresosDiario - egresosDiario * 1.15) * 30,
      escenarioCritico: (ingresosDiario - egresosDiario * 1.2) * 30,
      ingresosProyectados: ingresosDiario * 30,
      egresosProyectados: egresosDiario * 30,
    };

    return NextResponse.json({
      kpis: {
        totalIngresos,
        totalEgresos,
        flujoNeto,
        margen,
        transacciones: ventas.length,
        registrosGasto: gastos.length,
        saldoCaja: flujoNeto + 2000000, // saldo acumulado simulado
      },
      semanas,
      egresosCategoria: Object.values(egresosCategoria).sort((a, b) => b.total - a.total),
      ingresosMedio: Object.entries(ingresosMedio).map(([nombre, total]) => ({
        nombre,
        total,
        porcentaje: totalIngresos > 0 ? (total / totalIngresos) * 100 : 0,
      })),
      topEgresos,
      proyeccion,
    });
  } catch (error) {
    console.error("Error GET /api/flujo-caja:", error);
    return NextResponse.json({ error: "Error al obtener flujo de caja" }, { status: 500 });
  }
}

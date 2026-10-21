export const dynamic = "force-dynamic";
// app/api/medios-pago/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const medios = await prisma.medioPago.findMany({
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json({ medios });
}

// prisma/seed.ts
// Seed de datos de ejemplo para FinanzaHoy
// Datos representativos de una tienda de barrio en Colombia

import { PrismaClient, Rol, EstadoVenta, EstadoFiado } from "@prisma/client";
import { subDays, subHours, startOfDay, addHours } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de FinanzaHoy...");

  // ── 1. Negocio ──────────────────────────────────────────────
  const negocio = await prisma.negocio.upsert({
    where: { id: "negocio-demo-001" },
    update: {},
    create: {
      id: "negocio-demo-001",
      nombreComercial: "Tienda La Esperanza",
      nit: "900.123.456-7",
      tipoActividad: "Comercio al por menor / tienda física",
    },
  });
  console.log("✅ Negocio creado:", negocio.nombreComercial);

  // ── 2. Usuario admin ────────────────────────────────────────
  const bcrypt = await import("bcryptjs").catch(() => null);
  const hash = bcrypt
    ? await bcrypt.default.hash("demo1234", 10)
    : "$2a$10$placeholder_hash_for_demo";

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@finanzahoy.co" },
    update: {},
    create: {
      negocioId: negocio.id,
      nombreCompleto: "Diego Rodríguez",
      email: "admin@finanzahoy.co",
      passwordHash: hash,
      rol: Rol.ADMIN,
    },
  });
  console.log("✅ Usuario creado:", admin.email);

  // ── 3. Medios de pago ───────────────────────────────────────
  const mediosPago = await Promise.all([
    prisma.medioPago.upsert({ where: { nombre: "Efectivo" }, update: {}, create: { nombre: "Efectivo", icono: "💵" } }),
    prisma.medioPago.upsert({ where: { nombre: "Nequi" }, update: {}, create: { nombre: "Nequi", icono: "📱" } }),
    prisma.medioPago.upsert({ where: { nombre: "Daviplata" }, update: {}, create: { nombre: "Daviplata", icono: "📲" } }),
    prisma.medioPago.upsert({ where: { nombre: "Tarjeta" }, update: {}, create: { nombre: "Tarjeta", icono: "💳" } }),
    prisma.medioPago.upsert({ where: { nombre: "Fiado" }, update: {}, create: { nombre: "Fiado", icono: "📋" } }),
  ]);
  const [mpEfectivo, mpNequi, mpDaviplata, mpTarjeta, mpFiado] = mediosPago;
  console.log("✅ Medios de pago creados");

  // ── 4. Categorías de producto ───────────────────────────────
  const catProd = await Promise.all([
    prisma.categoriaProducto.upsert({ where: { id: "cat-prod-001" }, update: {}, create: { id: "cat-prod-001", nombre: "Granos y Cereales" } }),
    prisma.categoriaProducto.upsert({ where: { id: "cat-prod-002" }, update: {}, create: { id: "cat-prod-002", nombre: "Aceites y Grasas" } }),
    prisma.categoriaProducto.upsert({ where: { id: "cat-prod-003" }, update: {}, create: { id: "cat-prod-003", nombre: "Aseo y Limpieza" } }),
    prisma.categoriaProducto.upsert({ where: { id: "cat-prod-004" }, update: {}, create: { id: "cat-prod-004", nombre: "Lácteos y Bebidas" } }),
    prisma.categoriaProducto.upsert({ where: { id: "cat-prod-005" }, update: {}, create: { id: "cat-prod-005", nombre: "Abarrotes" } }),
  ]);
  console.log("✅ Categorías de producto creadas");

  // ── 5. Productos ────────────────────────────────────────────
  const productosData = [
    { id: "prod-001", nombre: "Arroz Supremo 5kg", costo: 14000, precio: 18000, stock: 45, catIdx: 0 },
    { id: "prod-002", nombre: "Aceite Girasol 1L", costo: 9500, precio: 12500, stock: 30, catIdx: 1 },
    { id: "prod-003", nombre: "Azúcar Blanca 2kg", costo: 5500, precio: 7500, stock: 40, catIdx: 0 },
    { id: "prod-004", nombre: "Harina de Trigo 1kg", costo: 3800, precio: 5200, stock: 25, catIdx: 0 },
    { id: "prod-005", nombre: "Detergente 500g", costo: 4200, precio: 6000, stock: 35, catIdx: 2 },
    { id: "prod-006", nombre: "Jabón de Baño x3", costo: 3500, precio: 5000, stock: 28, catIdx: 2 },
    { id: "prod-007", nombre: "Café Molido 250g", costo: 9000, precio: 12000, stock: 20, catIdx: 4 },
    { id: "prod-008", nombre: "Leche UHT 1L", costo: 3200, precio: 4500, stock: 50, catIdx: 3 },
    { id: "prod-009", nombre: "Pasta Espagueti 500g", costo: 2800, precio: 4000, stock: 60, catIdx: 4 },
    { id: "prod-010", nombre: "Sal x1kg", costo: 1200, precio: 2000, stock: 80, catIdx: 4 },
    { id: "prod-011", nombre: "Aceite Vegetal 3L", costo: 22000, precio: 30000, stock: 15, catIdx: 1 },
    { id: "prod-012", nombre: "Avena Tradicional 500g", costo: 3500, precio: 5500, stock: 22, catIdx: 0 },
    { id: "prod-013", nombre: "Gaseosa 1.5L", costo: 3800, precio: 5500, stock: 40, catIdx: 3 },
    { id: "prod-014", nombre: "Galletas Festival", costo: 2200, precio: 3500, stock: 55, catIdx: 4 },
    { id: "prod-015", nombre: "Atún en Lata", costo: 4500, precio: 6500, stock: 30, catIdx: 4 },
  ];

  for (const p of productosData) {
    await prisma.producto.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        negocioId: negocio.id,
        categoriaId: catProd[p.catIdx].id,
        nombre: p.nombre,
        costoCompra: p.costo,
        precioVenta: p.precio,
        stock: p.stock,
      },
    });
  }
  const productos = productosData;
  console.log("✅ Productos creados:", productos.length);

  // ── 6. Clientes ─────────────────────────────────────────────
  const clientesData = [
    { id: "cli-001", nombre: "Sebastián Ortiz", telefono: "3101234567" },
    { id: "cli-002", nombre: "María Fernández", telefono: "3209876543" },
    { id: "cli-003", nombre: "Carlos Mendoza", telefono: "3157654321" },
    { id: "cli-004", nombre: "Ana Lucía Torres", telefono: "3184567890" },
    { id: "cli-005", nombre: "Jorge Ramírez", telefono: "3143210987" },
    { id: "cli-006", nombre: "Claudia Herrera", telefono: "3162345678" },
    { id: "cli-007", nombre: "Roberto Silva", telefono: "3011234567" },
    { id: "cli-008", nombre: "Patricia López", telefono: "3022345678" },
    { id: "cli-009", nombre: "Andrés Castillo", telefono: "3133456789" },
    { id: "cli-010", nombre: "Luisa Martínez", telefono: "3194567890" },
    { id: "cli-011", nombre: "Fernando García", telefono: "3105678901" },
    { id: "cli-012", nombre: "Sandra Morales", telefono: "3226789012" },
    { id: "cli-013", nombre: "Miguel Peña", telefono: "3157890123" },
    { id: "cli-014", nombre: "Marcela Vargas", telefono: "3188901234" },
    { id: "cli-015", nombre: "Julio César Roa", telefono: "3149012345" },
  ];

  for (const c of clientesData) {
    await prisma.cliente.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, negocioId: negocio.id, nombreCompleto: c.nombre, telefono: c.telefono },
    });
  }
  console.log("✅ Clientes creados:", clientesData.length);

  // ── 7. Categorías de gasto ──────────────────────────────────
  const catGastos = await Promise.all([
    prisma.categoriaGasto.upsert({ where: { id: "catg-001" }, update: {}, create: { id: "catg-001", nombre: "Mercancía", color: "#f97316", icono: "📦" } }),
    prisma.categoriaGasto.upsert({ where: { id: "catg-002" }, update: {}, create: { id: "catg-002", nombre: "Nómina", color: "#8b5cf6", icono: "👥" } }),
    prisma.categoriaGasto.upsert({ where: { id: "catg-003" }, update: {}, create: { id: "catg-003", nombre: "Servicios", color: "#3b82f6", icono: "⚡" } }),
    prisma.categoriaGasto.upsert({ where: { id: "catg-004" }, update: {}, create: { id: "catg-004", nombre: "Arriendo", color: "#ec4899", icono: "🏪" } }),
    prisma.categoriaGasto.upsert({ where: { id: "catg-005" }, update: {}, create: { id: "catg-005", nombre: "Imprevistos", color: "#ef4444", icono: "🔧" } }),
    prisma.categoriaGasto.upsert({ where: { id: "catg-006" }, update: {}, create: { id: "catg-006", nombre: "Retiro Personal", color: "#f59e0b", icono: "💸" } }),
  ]);
  console.log("✅ Categorías de gasto creadas");

  // ── 8. Gastos del mes actual ────────────────────────────────
  const gastosData = [
    { catIdx: 0, concepto: "Compra proveedor Surimax", monto: 680000, diasAtras: 19 },
    { catIdx: 3, concepto: "Arriendo local comercial", monto: 320000, diasAtras: 17 },
    { catIdx: 1, concepto: "Quincena empleada", monto: 300000, diasAtras: 16 },
    { catIdx: 0, concepto: "Mercado Corabastos", monto: 285000, diasAtras: 16 },
    { catIdx: 2, concepto: "Internet + teléfono", monto: 180000, diasAtras: 15 },
    { catIdx: 0, concepto: "Bebidas y gaseosas", monto: 175000, diasAtras: 15 },
    { catIdx: 1, concepto: "Domiciliario tiempo parcial", monto: 160000, diasAtras: 17 },
    { catIdx: 4, concepto: "Reparación nevera", monto: 145000, diasAtras: 14 },
    { catIdx: 0, concepto: "Granos varios", monto: 210000, diasAtras: 12 },
    { catIdx: 5, concepto: "Retiro personal", monto: 150000, diasAtras: 10 },
    { catIdx: 0, concepto: "Abarrotes semana", monto: 320000, diasAtras: 9 },
    { catIdx: 2, concepto: "Gas propano", monto: 65000, diasAtras: 8 },
    { catIdx: 0, concepto: "Carnes y embutidos", monto: 280000, diasAtras: 6 },
    { catIdx: 4, concepto: "Bolsas y empaques", monto: 45000, diasAtras: 5 },
    { catIdx: 0, concepto: "Bebidas semana", monto: 195000, diasAtras: 3 },
    { catIdx: 2, concepto: "Servicio de agua", monto: 55000, diasAtras: 2 },
    { catIdx: 4, concepto: "Papelería", monto: 28000, diasAtras: 1 },
  ];

  for (let i = 0; i < gastosData.length; i++) {
    const g = gastosData[i];
    await prisma.gasto.create({
      data: {
        id: `gasto-seed-${i + 1}`,
        negocioId: negocio.id,
        usuarioId: admin.id,
        categoriaId: catGastos[g.catIdx].id,
        concepto: g.concepto,
        monto: g.monto,
        fecha: subDays(new Date(), g.diasAtras),
      },
    }).catch(() => {});
  }
  console.log("✅ Gastos creados:", gastosData.length);

  // ── 9. Ventas de los últimos 30 días ────────────────────────
  const mpMap = { Efectivo: mpEfectivo, Nequi: mpNequi, Daviplata: mpDaviplata, Tarjeta: mpTarjeta, Fiado: mpFiado };
  const mpList = [mpEfectivo, mpNequi, mpDaviplata, mpTarjeta];

  // Función helper para crear venta con detalle
  async function crearVenta(opts: {
    id: string;
    clienteId?: string;
    medioPagoId: string;
    items: Array<{ prodId: string; qty: number; precio: number }>;
    fecha: Date;
  }) {
    const subtotal = opts.items.reduce((s, i) => s + i.qty * i.precio, 0);
    await prisma.venta.create({
      data: {
        id: opts.id,
        negocioId: negocio.id,
        usuarioId: admin.id,
        clienteId: opts.clienteId ?? null,
        medioPagoId: opts.medioPagoId,
        subtotal,
        total: subtotal,
        createdAt: opts.fecha,
        estado: EstadoVenta.COMPLETADA,
        detalles: {
          create: opts.items.map((i) => ({
            productoId: i.prodId,
            cantidad: i.qty,
            precioUnitario: i.precio,
            subtotal: i.qty * i.precio,
          })),
        },
      },
    }).catch(() => {});
  }

  // Generar ~8 ventas por día durante 30 días
  let ventaIdx = 0;
  for (let d = 29; d >= 0; d--) {
    const base = startOfDay(subDays(new Date(), d));
    const ventasPorDia = 7 + Math.floor(Math.random() * 5);
    for (let v = 0; v < ventasPorDia; v++) {
      ventaIdx++;
      const hora = addHours(base, 8 + Math.floor(Math.random() * 12));
      const mp = mpList[Math.floor(Math.random() * mpList.length)];
      const prod1 = productosData[Math.floor(Math.random() * 8)];
      const prod2 = productosData[Math.floor(Math.random() * 8)];
      await crearVenta({
        id: `venta-seed-${ventaIdx}`,
        medioPagoId: mp.id,
        items: [
          { prodId: prod1.id, qty: 1 + Math.floor(Math.random() * 3), precio: prod1.precio },
          { prodId: prod2.id, qty: 1, precio: prod2.precio },
        ],
        fecha: hora,
      });
    }
  }
  console.log(`✅ Ventas creadas: ~${ventaIdx} registros`);

  // ── 10. Fiados con diferentes estados ───────────────────────
  const fiadosData = [
    { clienteId: "cli-001", monto: 142000, dias: 45, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-002", monto: 128000, dias: 38, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-003", monto: 115000, dias: 32, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-004", monto: 98000, dias: 22, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-005", monto: 94000, dias: 18, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-006", monto: 87000, dias: 14, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-007", monto: 82000, dias: 12, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-008", monto: 76000, dias: 9, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-009", monto: 71000, dias: 7, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-010", monto: 65000, dias: 3, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-011", monto: 58000, dias: 2, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-012", monto: 45000, dias: 5, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-013", monto: 120000, dias: 60, estado: EstadoFiado.ABONADO },
    { clienteId: "cli-014", monto: 95000, dias: 28, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-015", monto: 78000, dias: 20, estado: EstadoFiado.PENDIENTE },
    { clienteId: "cli-001", monto: 50000, dias: 90, estado: EstadoFiado.PAGADO },
    { clienteId: "cli-002", monto: 35000, dias: 70, estado: EstadoFiado.PAGADO },
    { clienteId: "cli-003", monto: 28000, dias: 55, estado: EstadoFiado.PAGADO },
    { clienteId: "cli-004", monto: 42000, dias: 45, estado: EstadoFiado.PAGADO },
    { clienteId: "cli-005", monto: 65000, dias: 35, estado: EstadoFiado.PAGADO },
  ];

  for (let i = 0; i < fiadosData.length; i++) {
    const f = fiadosData[i];
    const saldo = f.estado === EstadoFiado.PAGADO ? 0 : f.estado === EstadoFiado.ABONADO ? Math.floor(f.monto * 0.5) : f.monto;
    await prisma.fiado.create({
      data: {
        id: `fiado-seed-${i + 1}`,
        negocioId: negocio.id,
        clienteId: f.clienteId,
        montoOriginal: f.monto,
        saldoPendiente: saldo,
        estado: f.estado,
        createdAt: subDays(new Date(), f.dias),
        updatedAt: subDays(new Date(), f.dias),
        fechaVencimiento: subDays(new Date(), f.dias - 15),
      },
    }).catch(() => {});
  }
  console.log("✅ Fiados creados:", fiadosData.length);

  // ── 11. Arqueo de caja de hoy ────────────────────────────────
  await prisma.arqueoCaja.create({
    data: {
      id: "arqueo-seed-hoy",
      negocioId: negocio.id,
      usuarioId: admin.id,
      montoEsperado: 280000,
      montoFisico: 280000,
      diferencia: 0,
      observacion: "Caja perfectamente cuadrada",
      detalles: {
        create: [
          { medioPagoId: mpEfectivo.id, monto: 168000 },
          { medioPagoId: mpNequi.id, monto: 79200 },
          { medioPagoId: mpDaviplata.id, monto: 28800 },
          { medioPagoId: mpTarjeta.id, monto: 4000 },
        ],
      },
    },
  }).catch(() => {});
  console.log("✅ Arqueo de caja creado");

  // ── 12. Meta de ventas del mes ───────────────────────────────
  const now = new Date();
  const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await prisma.metaVenta.upsert({
    where: { negocioId_periodo: { negocioId: negocio.id, periodo } },
    update: {},
    create: {
      negocioId: negocio.id,
      periodo,
      montoMeta: 5000000,
    },
  });
  console.log("✅ Meta de ventas creada para:", periodo);

  console.log("\n🎉 Seed completado exitosamente!");
  console.log("   Negocio ID:", negocio.id);
  console.log("   Login: admin@finanzahoy.co / demo1234");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

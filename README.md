# FinanzaHoy 💰

**Gestión financiera ágil para pequeños emprendimientos colombianos**

Aplicación web para control de ventas, gastos, cartera (fiados) y flujo de caja. Diseñada para comerciantes que necesitan operar sin conocimientos contables, en menos de 15 segundos por transacción.

> Proyecto académico — Grupo 13 · Politécnico Grancolombiano  
> Módulo: Emprendimiento de Base Tecnológica · Octubre 2026

---

## 🚀 Demo en vivo

**[https://finanzahoy.vercel.app](https://finanzahoy.vercel.app)**

Credenciales demo:
- Email: `admin@finanzahoy.co`
- Password: `demo1234`

---

## 🛠 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend + API | Next.js 14 (App Router) |
| Base de datos | PostgreSQL (Neon serverless) |
| ORM | Prisma 5 |
| Estilos | Tailwind CSS |
| Gráficos | Recharts |
| Notificaciones | Sonner |
| Deploy | Vercel |

---

## 📋 Módulos Implementados

| Módulo | RF Cubiertos | Descripción |
|---|---|---|
| **Dashboard** | RF-04, RF-07, RF-08 | KPIs del día, gráficos de ventas, top productos, arqueo de caja |
| **Ventas / POS** | RF-01, RF-10 | Registro rápido, múltiples medios de pago, historial |
| **Gastos** | RF-02 | Registro por categoría, gráfico de distribución |
| **Cartera / Fiados** | RF-03, RF-05 | Semáforo verde/amarillo/rojo, abonos parciales |
| **Flujo de Caja** | RF-04, RF-08 | Análisis ingresos vs egresos, proyección 30 días |
| **Productos** | RF-06 | CRUD completo con cálculo de margen |

---

## ⚡ Despliegue en Vercel (paso a paso)

### Paso 1: Base de datos PostgreSQL en Neon

1. Crear cuenta en **[neon.tech](https://neon.tech)** (tier gratuito)
2. Crear un nuevo proyecto → anotar las connection strings:
   - **Pooled URL** (para `DATABASE_URL`) — usar para consultas normales
   - **Direct URL** (para `DIRECT_URL`) — usar para migraciones

### Paso 2: Subir el código a GitHub

```bash
# Desde la carpeta del proyecto
git init
git add .
git commit -m "feat: FinanzaHoy inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/finanzahoy.git
git push -u origin main
```

### Paso 3: Importar en Vercel

1. Ir a **[vercel.com/new](https://vercel.com/new)**
2. Conectar con GitHub y seleccionar el repositorio `finanzahoy`
3. Framework: **Next.js** (auto-detectado)
4. Build Command: `prisma generate && next build`
5. Install Command: `npm install --legacy-peer-deps`

### Paso 4: Configurar variables de entorno en Vercel

En el dashboard de Vercel → Settings → Environment Variables, añadir:

| Variable | Valor | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql://...?pgbouncer=true` | URL pooled de Neon |
| `DIRECT_URL` | `postgresql://...` | URL directa de Neon |
| `NEXTAUTH_SECRET` | *(ver abajo)* | Secreto de seguridad |
| `NEXTAUTH_URL` | `https://tu-app.vercel.app` | URL pública de la app |
| `DEMO_NEGOCIO_ID` | `negocio-demo-001` | ID del negocio demo |

**Generar NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Paso 5: Aplicar migraciones y seed

Después del primer deploy exitoso, ejecutar desde tu máquina local:

```bash
# Configurar .env.local con las variables de Neon
cp .env.example .env.local
# Editar .env.local con tus URLs de Neon

# Aplicar el esquema a la base de datos
npx prisma db push

# Cargar datos de ejemplo
npm run db:seed
```

### Paso 6: Redeployar (para confirmar)

```bash
git commit --allow-empty -m "trigger: redeploy after db setup"
git push
```

---

## 💻 Desarrollo Local

### Requisitos
- Node.js 18+
- PostgreSQL local o cuenta en Neon

```bash
# 1. Clonar
git clone https://github.com/TU_USUARIO/finanzahoy.git
cd finanzahoy

# 2. Instalar dependencias
npm install --legacy-peer-deps

# 3. Configurar entorno
cp .env.example .env.local
# Editar .env.local con tu DATABASE_URL

# 4. Generar cliente Prisma
npm run db:generate

# 5. Aplicar esquema
npm run db:push

# 6. Cargar datos de ejemplo
npm run db:seed

# 7. Iniciar servidor de desarrollo
npm run dev
```

Abrir **http://localhost:3000**

---

## 🗄️ Modelo de Datos (15 tablas)

```
negocios ─────────────────────────────────────────────────────────
    │
    ├── usuarios (rol: ADMIN | VENDEDOR)
    ├── productos → categorias_producto
    ├── clientes
    ├── ventas ──────────────────────────────────────────────────
    │   ├── detalle_ventas → productos
    │   └── fiados ──────────────────────────────────────────────
    │       └── abonos_fiado → medios_pago
    ├── gastos → categorias_gasto
    ├── arqueos_caja → arqueo_detalle_medios → medios_pago
    └── metas_ventas
```

---

## 📊 API REST

| Endpoint | Métodos | Descripción |
|---|---|---|
| `/api/dashboard` | GET | KPIs, ventas semana, top productos, arqueo |
| `/api/ventas` | GET, POST | Listado y registro de ventas |
| `/api/gastos` | GET, POST | Listado y registro de gastos |
| `/api/cartera` | GET, POST | Fiados con semáforo |
| `/api/cartera/[id]/abonar` | POST | Registrar abono |
| `/api/flujo-caja` | GET | Análisis financiero y proyecciones |
| `/api/productos` | GET, POST | CRUD de catálogo |
| `/api/clientes` | GET, POST | Gestión de clientes |
| `/api/medios-pago` | GET | Listado de medios disponibles |

---

## 🧪 Comandos útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run db:push      # Aplicar esquema a la DB
npm run db:seed      # Cargar datos de ejemplo
npm run db:studio    # Abrir Prisma Studio (GUI de la DB)
npm run db:reset     # Reset completo y re-seed
```

---

## 📁 Estructura del Proyecto

```
finanzahoy/
├── prisma/
│   ├── schema.prisma        # 15 tablas del modelo de datos
│   └── seed.ts              # Datos de ejemplo
├── src/
│   ├── app/
│   │   ├── api/             # API Routes (REST endpoints)
│   │   └── dashboard/       # Páginas de la aplicación
│   ├── components/
│   │   ├── layout/          # Sidebar, Header
│   │   └── ui/              # Componentes reutilizables
│   └── lib/
│       ├── prisma.ts        # Cliente Prisma singleton
│       └── utils.ts         # Formateo COP, semáforo, fechas
├── vercel.json
└── next.config.mjs
```

---

## 👥 Equipo — Grupo 13

| Integrante | Rol |
|---|---|
| Johann Ricaurte Fonseca | QA / Testing |
| Johan Rivera Muñoz | Base de Datos |
| Diego Alejandro Rodríguez Castro | Frontend |
| María Yicely Sánchez Rodas | Backend / Integración |

**Tutor:** Milton Mateus  
**Institución:** Politécnico Grancolombiano — Octubre 2026

---

## 📄 Licencia

Proyecto académico — uso educativo exclusivo.

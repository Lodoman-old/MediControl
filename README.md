# MediControl

Sistema de gestion de consultorio medico (web + movil) disenado para escalar a un HIS multisede. Cumple NOM-004-SSA3-2012 y NOM-024-SSA3-2012.

## Estado del proyecto

**Sprint 1 completado**: cimientos de datos + Auth + login real en web y movil.

- Multi-tenant Postgres + Prisma con `Organization → Branch → ServiceLocation` desde dia 1
- Auth JWT con access (15m) + refresh rotativo (7d) y deteccion de reuso
- RBAC con 6 roles (SUPERADMIN, ADMIN, DOCTOR, NURSE, RECEPTION, PATIENT) y 20 permisos catalog
- Login real conectado en web (React + Vite) y movil (Expo + RN)
- Stack: NestJS 10 + Prisma 5 + React 18 + RN 0.74 + Expo SDK 51

## Estructura del monorepo

```
MediControl/
├── apps/
│   ├── api/        Backend NestJS (REST, JWT, Prisma, PostgreSQL)
│   ├── mobile/     App movil Expo / React Native (pacientes + medicos)
│   └── web/        Portal web React + Vite (admin + medicos)
├── packages/
│   └── brand/      Tokens de diseno y referencias de logo compartidas
├── brand/          Assets oficiales de marca (fuente unica de verdad)
├── docker/         Init SQL para Postgres (extensiones, etc.)
├── docker-compose.yml
└── ...
```

## Requisitos

- **Node.js 20.11+** (probado en 24.16)
- **pnpm 9+** (`npm install -g pnpm`)
- **Docker Desktop** (para Postgres, Redis, MinIO)
- **Git**
- Para movil: **Expo Go** en tu telefono o emulador Android / simulador iOS

## Quick start (Sprint 1)

```powershell
# 1. Levantar infra (Postgres en :5433, Redis en :6380, MinIO en :9002/9003)
docker compose up -d

# 2. Instalar dependencias
pnpm install

# 3. Crear .env del API (solo la primera vez)
Copy-Item apps\api\.env.example apps\api\.env

# 4. Generar cliente Prisma + crear schema en BD
pnpm --filter @medicontrol/api prisma:generate
pnpm --filter @medicontrol/api exec prisma db push

# 5. Sembrar datos demo (org, sede, roles, 3 usuarios)
pnpm --filter @medicontrol/api prisma:seed

# 6. Compilar y arrancar API
pnpm --filter @medicontrol/api build
pnpm --filter @medicontrol/api start

# 7. En otra terminal: web y/o movil
pnpm dev:web
pnpm dev:mobile
```

### Cuentas demo (sembradas en paso 5)

| Email | Password | Rol | Permisos |
|---|---|---|---|
| `admin@medicontrol.mx` | `Admin123!Demo` | ADMIN | 14 (gestion operativa) |
| `doctor@medicontrol.mx` | `Doctor123!Demo` | DOCTOR | 10 (atencion clinica) |
| `paciente@medicontrol.mx` | `Paciente123!Demo` | PATIENT | 2 (cuenta propia) |

## Endpoints

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| `GET` | `/api/v1/health` | publico | Health check con DB y Redis |
| `POST` | `/api/v1/auth/login` | publico | Login con email + password. Devuelve access + refresh y setea cookie httpOnly `refresh_token` |
| `POST` | `/api/v1/auth/refresh` | cookie o body | Rota el refresh token. Si se reusa uno viejo, revoca toda la familia |
| `POST` | `/api/v1/auth/logout` | bearer | Revoca el refresh token actual |
| `GET` | `/api/v1/auth/me` | bearer | Devuelve usuario + roles + permisos |

### Documentacion interactiva (Swagger)

`http://localhost:3000/api/v1/docs` — UI web con todos los endpoints, schemas y posibilidad de probar llamadas directamente.

## Comandos

| Comando | Resultado |
|---|---|
| `pnpm dev` | Levanta web + api + mobile en paralelo (requiere `pnpm dev:api` ya corriendo) |
| `pnpm build` | Build de produccion de los tres |
| `pnpm typecheck` | Validacion TypeScript |
| `pnpm lint` | Linter en todos los paquetes |
| `pnpm test` | Tests |
| `pnpm clean` | Limpia builds y caches |
| `pnpm --filter @medicontrol/api prisma:studio` | GUI de la base de datos |

> **Tip Windows**: NO copies comentarios con `#` al final del comando en PowerShell.
> Aunque en scripts `.ps1` `#` es comentario, al copiar la linea completa al prompt,
> los argumentos posteriores al `#` se reenvian a la herramienta y rompen la ejecucion.
> Copia solo el comando, sin la parte "# explicacion".

## Puertos de desarrollo

| Servicio | Host port | Container port |
|---|---|---|
| Postgres | 5433 | 5432 |
| Redis | 6380 | 6379 |
| MinIO API | 9002 | 9000 |
| MinIO console | 9003 | 9001 |
| Adminer | 8082 | 8080 |
| API NestJS | 3000 | - |
| Swagger UI | 3000 | `/api/v1/docs` |
| Web Vite | 5173 | - |
| Expo DevTools | 8081 | - |

Los puertos no estandar (5433, 6380, etc.) son para evitar conflictos con servicios locales
que pudieran estar usando los puertos clasicos (Postgres en 5432, Redis en 6379, etc.).

## Marca y logos

Los assets viven en `brand/` y se distribuyen a las apps. Para regenerar:

```powershell
Copy-Item brand\isopo.png apps\web\public\favicon.png -Force
Copy-Item brand\isopo.png apps\web\public\isopo.png -Force
Copy-Item brand\logo-horizontal.png apps\web\public\logo-horizontal.png -Force
Copy-Item brand\isopo.png apps\mobile\assets\icon.png -Force
Copy-Item brand\isopo.png apps\mobile\assets\adaptive-icon.png -Force
Copy-Item brand\isopo.png apps\mobile\assets\splash-icon.png -Force
Copy-Item brand\isopo.png apps\mobile\assets\favicon.png -Force
Copy-Item brand\logo-horizontal.png apps\mobile\assets\logo-horizontal.png -Force
```

Los colores de marca estan centralizados en `packages/brand/src/tokens.ts` y son consumidos por:
- **Web**: `tailwind.config.ts` los importa y los expone como utilidades `bg-primary-500`, `text-ink-900`, etc.
- **Movil**: `App.tsx` los importa directamente para `StyleSheet.create`.

Ver `brand/README.md` para guia de uso de marca.

## Roadmap

- [x] **S1**: Multi-tenant data foundation + Auth + login real (web y mobile)
- [ ] **S2**: MFA TOTP + primer cambio de contraseña forzado + gestión de usuarios (admin)
- [ ] **S3**: Módulo Schedule (agenda con `EXCLUDE USING gist` para evitar conflictos)
- [ ] **S4**: Módulo Clinical Record (expediente NOM-004, firma criptográfica)
- [ ] **S5**: Módulo Payments (motor hibrido: Cash, POS, SPEI manual, MP dormant)
- [ ] **S6**: Módulo Notify (WhatsApp + Email)
- [ ] **S7**: Portal del paciente con auto-registro y recuperación de contraseña
- [ ] **S8**: App móvil para médicos (consulta, expediente móvil, firma)
- [ ] **S9**: CI/CD GitHub Actions + migraciones versionadas
- [ ] **S10**: Observabilidad (Sentry, OpenTelemetry, dashboards)

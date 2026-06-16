# MediControl — Architectural Design

## Overview

Multi-tenant clinic management platform targeting NOM-004-SSA3-2012 / NOM-024-SSA3-2012 / LFPDPPP compliance. Monorepo with shared brand tokens.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend (Web) | React 18, Vite 5, Tailwind 3.4, Zustand 5, React Query 5 |
| Frontend (Mobile) | Expo SDK 51, React Native 0.74, Zustand 5 |
| Backend | NestJS 10, Prisma 5, PostgreSQL 16 |
| Auth | JWT access + rotating refresh families, Argon2id, TOTP via otplib |
| Infra | Docker Compose (Postgres 16, Redis 7, MinIO) |

## Project Structure

```
MediControl/
├── apps/
│   ├── api/          # NestJS REST API
│   │   └── src/
│   │       ├── auth/         # Auth (JWT, MFA, change password)
│   │       ├── admin/        # User management
│   │       ├── schedule/     # Weekly schedules + available slots
│   │       ├── appointment/  # Appointment CRUD + day summary
│   │       ├── common/       # Filters, interceptors, middleware
│   │       └── prisma/       # Prisma service + schema
│   ├── web/          # React SPA (admin panel)
│   └── mobile/       # Expo app (patients + doctors)
├── packages/
│   └── brand/        # Shared design tokens
└── docker-compose.yml
```

## Tenant Model

```
Organization → Branch → ServiceLocation
```

Every operational table carries `organizationId`. Multi-tenancy enforced at query level via `TenantContextMiddleware` + Prisma `where` clauses.

## API Conventions

- Base path: `/api/v1`
- Auth: Bearer JWT via global `JwtAuthGuard` (opt-out with `@Public()`)
- Roles: `@Roles()` decorator + global `RolesGuard`
- Swagger: `/api/v1/docs`
- All endpoints are organization-scoped via `CurrentUser` decorator

## Auth Flow

```
Login → { tokens, mustChangePassword?, mfaRequired? }
  ├─ mustChangePassword → POST /auth/change-password
  ├─ mfaRequired → POST /auth/mfa/verify-login { mfaToken, code }
  └─ OK → accessToken (5min) + refreshToken (7d, single-use, family-tracked)
```

Refresh rotation: each use issues a new token and revokes the old one. Family revocation invalidates all siblings on reuse detection.

## Data Models

- **User** → Person (1:1), UserRole (1:N), Doctor (0:1), Patient (0:1)
- **Doctor** → Schedule (1:N), ScheduleException (1:N), Appointment (1:N)
- **Patient** → Appointment (1:N)
- **Appointment** → Service, ServiceLocation, Branch
- **Schedule**: weekly recurring time blocks per doctor
- **ScheduleException**: date-specific overrides (blocked or custom hours)

## Key Decisions

- Tailwind 3.4 (stable), React 18.3 (ecosystem maturity)
- `tsc -w` + `node dist/main.js` for API dev (tsx doesn't emit decorator metadata)
- `prisma db push` for dev schema evolution; migrate planned for production
- Refresh token rotation + family revocation from day one
- MFA secret encrypted with AES-256-GCM (node:crypto), stored as Buffer
- Admin module reuses `@Roles()` + `RolesGuard` (no separate guard)
- Non-standard host ports (5433, 6380, 9002, etc.) to avoid WSL2 conflicts
- `node-linker=hoisted` in `.npmrc` because Metro can't resolve pnpm isolated structure

## API Endpoints

### Auth
- `POST /auth/login` — email + password → tokens
- `POST /auth/refresh` — rotate refresh token
- `POST /auth/logout` — revoke refresh token
- `GET /auth/me` — current user profile
- `POST /auth/change-password` — force password change
- `POST /auth/mfa/setup` — generate TOTP secret
- `POST /auth/mfa/verify` — verify + enable MFA
- `POST /auth/mfa/disable` — disable MFA
- `POST /auth/mfa/verify-login` — complete MFA challenge

### Admin
- `GET /admin/users` — paginated user list with search/filter
- `GET /admin/users/:id` — user detail
- `POST /admin/users` — create user
- `PATCH /admin/users/:id` — update user
- `POST /admin/users/:id/reset-password` — reset + invalidate tokens
- `GET /admin/branches` — branch list for dropdowns

### Schedule
- `GET /schedule` — list weekly schedules (optional `doctorId`)
- `POST /schedule` — create schedule entry
- `PATCH /schedule/:id` — update schedule
- `DELETE /schedule/:id` — delete schedule
- `GET /schedule/exceptions` — list exceptions
- `POST /schedule/exceptions` — create exception
- `DELETE /schedule/exceptions/:id` — delete exception
- `GET /schedule/available-slots` — compute free slots for doctor+date

### Appointments
- `GET /appointments` — list with filters (doctor, patient, date, status)
- `GET /appointments/:id` — appointment detail
- `POST /appointments` — create (with overlap validation)
- `PATCH /appointments/:id` — update (status, reschedule)
- `GET /appointments/day/:date` — daily summary + details

## Security

- Passwords: Argon2id (memoryCost 19456, timeCost 2, parallelism 1)
- MFA secrets: AES-256-GCM encrypted at rest
- JWT: RS256 or HS256, 5min access + 7d refresh
- Rate limiting: via Redis (planned)
- Audit log: all sensitive actions logged to `access_log`
- RBAC: role-permission matrix, user can have multiple roles

# ============================================================================
# MediControl — Setup & Migration Guide
# Sprint 5 additions: ReportSchedule, MercadoPago, Pharmacy Dispensing, Mobile Inventory
# ============================================================================

## 1. Prerequisites
- Docker Desktop (Postgres 16 + Redis 7 + MinIO)
- Node 24, pnpm 9

## 2. Start infrastructure
```powershell
docker-compose up -d
```

## 3. Apply migrations
```powershell
cd apps/api

# Generate Prisma client (already done)
npx prisma generate

# Apply new migration for ReportSchedule model
npx prisma migrate dev --name add_report_schedule

# Seed database
npx tsx prisma/seed.ts
```

## 4. Environment variables (.env)
```env
# Existing
DATABASE_URL="postgresql://medicontrol:medicontrol123@localhost:5433/medicontrol_dev?schema=public"
MFA_ENCRYPTION_KEY="your-32-char-min-key-here"

# NEW — Mercado Pago (real)
MERCADOPAGO_ACCESS_TOKEN="TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxx"
APP_URL="http://localhost:5173"       # Frontend URL (for back_urls)
API_URL="http://localhost:3000"       # API URL   (for notification_url)

# NEW — Reportes programados (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="tu-correo@gmail.com"
SMTP_PASS="tu-contrasena-aplicacion"
SMTP_FROM="reportes@medicontrol.mx"
```

## 5. Run tests
```powershell
# Unit tests (no DB needed)
cd apps/api && npx jest --testPathPattern="(pdf|mail|payment-strategies).*spec" --no-coverage

# Full integration tests (DB needed)
cd apps/api && npx jest --no-coverage
```

## 6. Start dev
```powershell
# Terminal 1: API
cd apps/api && pnpm run dev:all

# Terminal 2: Web
cd apps/web && pnpm run dev

# Terminal 3: Mobile (optional)
cd apps/mobile && npx expo start --web
```

## 7. What was added in this Sprint 5 session

### Reportes programados
- Model: `ReportSchedule` (name, reportType, cronExpression, recipients, format, lastSentAt, isActive)
- Service: CRUD + `@Cron(EVERY_30_SECONDS)` with `shouldRun()` + manual trigger
- PDF: PdfService (pdfkit) with 4 generators (revenue, appointments, patients, doctors)
- Email: MailService (nodemailer SMTP, gracefull fallback if SMTP_HOST not set)
- API: `POST/GET/PATCH/DELETE /report-schedules`, `POST /report-schedules/:id/trigger`
- Web UI: `/reportes/programados` with frequency presets + send now + delete

### Mercado Pago real
- SDK: `mercadopago@3`
- Strategy: `MercadoPagoStrategy.process()` creates real Preference via `Preference.create`
- Includes: items (id, title, unit_price, quantity), back_urls (success/failure/pending), notification_url
- Webhook: `POST /payments/mercadopago/webhook` (public, no auth)
  - Dynamically imports mercadopago SDK
  - Verifies `status === "approved"`
  - Finds payment by external_reference via `findFirst`
  - Updates to COMPLETED
- Feature flag: `FEATURE_MERCADOPAGO_ENABLED` (env var)

### Pharmacy dispensing (Rx-linked)
- Sales: `POST /pharmacy/sales` items can include `prescriptionId`
- Transaction: validates prescription (not DISPENSED/COMPLETED/CANCELLED/EXPIRED)
  - Creates `Dispensing` record
  - Links dispensing to sale item via `dispensingId`
  - Updates `PrescriptionStatus` to PARTIALLY_DISPENSED or DISPENSED
- POS Web UI: accepts `?prescriptionId=` query param
  - Pre-selects patient from prescription
  - Shows banner: "Despachando receta: [medication] [dosage]"
  - Items show "Rx" badge
  - Sends `prescriptionId` in sale payload

### Mobile pharmacy inventory
- Screen: `PharmacyScreen.tsx`
- Lists medications with total stock + expandable batch details
- Color-coded stock (green = available, red = out of stock)
- Navigation: registered as `"pharmacy"` in App.tsx
- Button: "Inventario" on HomeScreen for doctors

## 8. Module registration in AppModule
```typescript
MailModule,        // SMTP email service (global)
PdfModule,         // PDF generation service (global)
ReportScheduleModule, // Scheduled reports with cron + CRUD API
```

## 9. Fixes applied
- ReportsModule exports ReportsService (was missing, causing DI error)
- Prisma client regenerated after adding ReportSchedule model
- PdfService return type corrected (Buffer → Promise<Buffer>)
- MercadoPago SDK Items.id added (required field)
- Webhook body cast to `any` for nested access
- Payment update uses `findFirst` + `update` by id (reference not unique)
- Organization model has `reportSchedules ReportSchedule[]` relation
- SPEI test uses `setTimeout(2ms)` to avoid duplicate references

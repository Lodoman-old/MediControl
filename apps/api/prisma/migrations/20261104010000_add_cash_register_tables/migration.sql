-- Tablas de caja que estaban en el schema Prisma pero no en migraciones.
DO $$
BEGIN
  CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "cash_registers" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMPTZ,
  "initial_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "expected_amount" DECIMAL(12, 2),
  "actual_amount" DECIMAL(12, 2),
  "difference" DECIMAL(12, 2),
  "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "opened_by_user_id" UUID NOT NULL,
  "closed_by_user_id" UUID,
  CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cash_registers_organization_id_branch_id_status_idx"
  ON "cash_registers"("organization_id", "branch_id", "status");

CREATE INDEX IF NOT EXISTS "cash_registers_branch_id_opened_at_idx"
  ON "cash_registers"("branch_id", "opened_at");

CREATE TABLE IF NOT EXISTS "cash_movements" (
  "id" UUID NOT NULL,
  "cash_register_id" UUID NOT NULL,
  "type" "MovementType" NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "reason" VARCHAR(255),
  "reference_id" VARCHAR(80),
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cash_movements_cash_register_id_idx"
  ON "cash_movements"("cash_register_id");

CREATE INDEX IF NOT EXISTS "cash_movements_created_at_idx"
  ON "cash_movements"("created_at");

DO $$
BEGIN
  ALTER TABLE "cash_registers"
    ADD CONSTRAINT "cash_registers_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "cash_registers"
    ADD CONSTRAINT "cash_registers_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "cash_registers"
    ADD CONSTRAINT "cash_registers_opened_by_user_id_fkey"
    FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "cash_registers"
    ADD CONSTRAINT "cash_registers_closed_by_user_id_fkey"
    FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "cash_movements"
    ADD CONSTRAINT "cash_movements_cash_register_id_fkey"
    FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "cash_movements"
    ADD CONSTRAINT "cash_movements_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

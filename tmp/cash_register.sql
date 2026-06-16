CREATE TABLE IF NOT EXISTS "cash_registers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "opened_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "closed_at" TIMESTAMPTZ,
  "initial_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "expected_amount" DECIMAL(12,2),
  "actual_amount" DECIMAL(12,2),
  "difference" DECIMAL(12,2),
  "status" VARCHAR(10) NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "opened_by_user_id" UUID NOT NULL,
  "closed_by_user_id" UUID
);

CREATE TABLE IF NOT EXISTS "cash_movements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cash_register_id" UUID NOT NULL REFERENCES "cash_registers"(id) ON DELETE CASCADE,
  "type" VARCHAR(10) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "reason" VARCHAR(255),
  "reference_id" VARCHAR(80),
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_org_branch_status ON "cash_registers"("organization_id", "branch_id", "status");
CREATE INDEX IF NOT EXISTS idx_cash_registers_branch_opened ON "cash_registers"("branch_id", "opened_at");
CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON "cash_movements"("cash_register_id");
CREATE INDEX IF NOT EXISTS idx_cash_movements_created ON "cash_movements"("created_at");

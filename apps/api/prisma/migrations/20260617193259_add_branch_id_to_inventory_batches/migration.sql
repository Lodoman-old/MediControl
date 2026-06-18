-- AlterTable: add branch_id to inventory_batches
ALTER TABLE "inventory_batches" ADD COLUMN "branch_id" UUID;

-- Add index on branch_id
CREATE INDEX "inventory_batches_branch_id_idx" ON "inventory_batches"("branch_id");

-- Drop old unique constraint
ALTER TABLE "inventory_batches" DROP CONSTRAINT IF EXISTS "inventory_batches_organization_id_batch_number_medication_id_key";

-- New unique index including branch_id (nullable, so COALESCE handles nulls for uniqueness)
CREATE UNIQUE INDEX "inventory_batches_organization_id_batch_number_medication_id_branch_id_key"
  ON "inventory_batches"("organization_id", "batch_number", "medication_id", COALESCE("branch_id", '00000000-0000-0000-0000-000000000000'::uuid));

-- Add foreign key constraint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL;

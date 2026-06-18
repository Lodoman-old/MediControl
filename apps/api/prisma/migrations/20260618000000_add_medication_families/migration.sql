-- CreateTable: medication_families
CREATE TABLE "medication_families" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "medication_families_pkey" PRIMARY KEY ("id")
);

-- Add column family_id to medications
ALTER TABLE "medications" ADD COLUMN "family_id" UUID;

-- Create index on family_id
CREATE INDEX "medications_family_id_idx" ON "medications"("family_id");

-- Add foreign key constraint
ALTER TABLE "medications" ADD CONSTRAINT "medications_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "medication_families"("id") ON DELETE SET NULL;

-- Add foreign key on medication_families
ALTER TABLE "medication_families" ADD CONSTRAINT "medication_families_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

-- Create unique index on organization_id + name
CREATE UNIQUE INDEX "medication_families_organization_id_name_key"
    ON "medication_families"("organization_id", "name");

-- Create index on organization_id
CREATE INDEX "medication_families_organization_id_idx" ON "medication_families"("organization_id");

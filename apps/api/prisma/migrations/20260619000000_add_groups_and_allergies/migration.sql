-- CreateTable: medication_groups
CREATE TABLE "medication_groups" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "medication_groups_pkey" PRIMARY KEY ("id")
);

-- Add group_id to medication_families
ALTER TABLE "medication_families" ADD COLUMN "group_id" UUID;

-- Create index on group_id
CREATE INDEX "medication_families_group_id_idx" ON "medication_families"("group_id");

-- Add foreign key on medication_groups
ALTER TABLE "medication_groups" ADD CONSTRAINT "medication_groups_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

-- Add foreign key on medication_families group_id
ALTER TABLE "medication_families" ADD CONSTRAINT "medication_families_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "medication_groups"("id") ON DELETE SET NULL;

-- Create unique index on organization_id + name
CREATE UNIQUE INDEX "medication_groups_organization_id_name_key" ON "medication_groups"("organization_id", "name");

-- Create index on organization_id
CREATE INDEX "medication_groups_organization_id_idx" ON "medication_groups"("organization_id");

-- CreateTable: patient_allergies
CREATE TABLE "patient_allergies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "medication_id" UUID,
    "family_id" UUID,
    "group_id" UUID,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'MODERATE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "patient_allergies_pkey" PRIMARY KEY ("id")
);

-- Indexes for patient_allergies
CREATE INDEX "patient_allergies_organization_id_idx" ON "patient_allergies"("organization_id");
CREATE INDEX "patient_allergies_patient_id_idx" ON "patient_allergies"("patient_id");
CREATE INDEX "patient_allergies_medication_id_idx" ON "patient_allergies"("medication_id");
CREATE INDEX "patient_allergies_family_id_idx" ON "patient_allergies"("family_id");
CREATE INDEX "patient_allergies_group_id_idx" ON "patient_allergies"("group_id");

-- Foreign keys for patient_allergies
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_medication_id_fkey"
    FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE SET NULL;
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "medication_families"("id") ON DELETE SET NULL;
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "medication_groups"("id") ON DELETE SET NULL;

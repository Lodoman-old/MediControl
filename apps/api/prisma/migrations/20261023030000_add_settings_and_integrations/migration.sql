-- Configuracion de la clinica (branding/contacto) e integraciones cifradas.

ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "display_name" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "logo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "primary_color" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "secondary_color" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "phone" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "email" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "website" VARCHAR(200);

CREATE TABLE IF NOT EXISTS "integration_configs" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "provider" VARCHAR(30) NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "config_enc" TEXT,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_configs_organization_id_provider_key"
  ON "integration_configs"("organization_id", "provider");

ALTER TABLE "integration_configs" DROP CONSTRAINT IF EXISTS "integration_configs_organization_id_fkey";
ALTER TABLE "integration_configs"
  ADD CONSTRAINT "integration_configs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

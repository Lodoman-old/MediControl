-- Add public booking slug to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_key" ON "organizations"("slug");

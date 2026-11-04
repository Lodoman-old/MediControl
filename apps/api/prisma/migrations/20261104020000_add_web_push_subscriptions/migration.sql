CREATE TABLE IF NOT EXISTS "web_push_subscriptions" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "user_agent" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "web_push_subscriptions_endpoint_key"
  ON "web_push_subscriptions"("endpoint");

CREATE INDEX IF NOT EXISTS "web_push_subscriptions_organization_id_user_id_idx"
  ON "web_push_subscriptions"("organization_id", "user_id");

CREATE INDEX IF NOT EXISTS "web_push_subscriptions_user_id_idx"
  ON "web_push_subscriptions"("user_id");

DO $$
BEGIN
  ALTER TABLE "web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

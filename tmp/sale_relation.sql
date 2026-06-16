ALTER TABLE "sales" ADD COLUMN "created_by_user_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON "sales"("created_by_user_id");

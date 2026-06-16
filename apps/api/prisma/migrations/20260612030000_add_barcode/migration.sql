ALTER TABLE "medications" ADD COLUMN "barcode" VARCHAR(30);
CREATE UNIQUE INDEX "medications_organization_id_barcode_key" ON "medications"("organization_id", "barcode");

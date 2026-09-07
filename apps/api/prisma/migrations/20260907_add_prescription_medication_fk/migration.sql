-- AlterTable: Add medicationId FK to prescriptions
ALTER TABLE "prescriptions" ADD COLUMN "medication_id" UUID;

-- CreateIndex: Add index for medicationId
CREATE INDEX "prescriptions_medication_id_idx" ON "prescriptions"("medication_id");

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_medication_id_fkey"
  FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

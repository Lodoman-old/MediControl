ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'IN_TRIAGE';
ALTER TABLE "vital_signs" ALTER COLUMN "clinical_note_id" DROP NOT NULL;
ALTER TABLE "vital_signs" ADD COLUMN IF NOT EXISTS "appointment_id" UUID;
CREATE INDEX IF NOT EXISTS "vital_signs_appointment_id_idx" ON "vital_signs"("appointment_id");

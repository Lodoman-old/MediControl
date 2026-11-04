-- Estado usado al crear citas desde la agenda (pendiente de confirmar por el medico).
-- El schema lo define, pero faltaba en las migraciones.
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'PENDING_DOCTOR_CONFIRMATION' BEFORE 'SCHEDULED';

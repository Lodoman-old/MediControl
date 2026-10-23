-- Alinea la BD con el schema Prisma: una cita puede ser a nivel sucursal
-- sin consultorio/ubicacion especifica.
ALTER TABLE "appointments" ALTER COLUMN "service_location_id" DROP NOT NULL;

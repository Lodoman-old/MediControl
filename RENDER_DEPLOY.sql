-- ============================================================================
-- SCRIPT DE DEPLOY PARA RENDER (ejecutar en Shell de Render)
-- ============================================================================
-- 1. Aplicar migraciones pendientes (incluye organization.slug)
-- 2. Asignar slug a la organización
-- 3. Verificar resultado
-- ============================================================================

-- Paso 1: Ejecutar migraciones (el docker-entrypoint.sh lo hace automáticamente al arrancar)
-- Si quieres forzarlo manualmente:
-- npx prisma migrate deploy

-- Paso 2: Asignar slug a la organización de desarrollo
-- Ajusta el WHERE según tu organización
UPDATE organizations
SET slug = 'demo'
WHERE legal_name ILIKE '%medi%'
   OR legal_name ILIKE '%clinic%'
   OR legal_name ILIKE '%control%'
   OR id = (SELECT id FROM organizations LIMIT 1);

-- Paso 3: Verificar slug asignado
SELECT id, legal_name, slug, org_type
FROM organizations
WHERE slug IS NOT NULL;

-- Paso 4: Probar endpoint público (desde terminal o curl)
-- curl "https://medicontrol-api-h9x3.onrender.com/api/v1/schedule/public/doctors?slug=demo"
-- curl "https://medicontrol-api-h9x3.onrender.com/api/v1/schedule/public/services?slug=demo"
-- curl "https://medicontrol-api-h9x3.onrender.com/api/v1/schedule/public/available-slots?slug=demo&doctorId=<ID>&date=2026-10-25&serviceId=<ID>"

-- Paso 5: Probar reserva completa
-- curl -X POST "https://medicontrol-api-h9x3.onrender.com/api/v1/public/appointments" \
--   -H "Content-Type: application/json" \
--   -d '{
--     "slug": "demo",
--     "doctorId": "<DOCTOR_ID>",
--     "serviceId": "<SERVICE_ID>",
--     "branchId": "<BRANCH_ID>",
--     "date": "2026-10-25",
--     "startTime": "10:00",
--     "firstName": "Juan",
--     "lastNameP": "Perez",
--     "phone": "+525512345678",
--     "birthDate": "1990-01-15",
--     "gender": "M"
--   }'
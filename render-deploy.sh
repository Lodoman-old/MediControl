#!/bin/bash
# ============================================================================
# SCRIPT DE DEPLOY PARA RENDER SHELL
# Copia y pega esto en el Shell de Render (Dashboard → medicontrol-api → Shell)
# ============================================================================

set -e

echo "🚀 Iniciando deploy en Render..."

# 1. Aplicar migraciones pendientes
echo "📦 Aplicando migraciones Prisma..."
npx prisma migrate deploy

# 2. Asignar slug a la organización
echo "🏷️  Asignando slug 'demo' a la organización..."
npx prisma db execute --stdin <<'SQL'
UPDATE organizations
SET slug = 'demo'
WHERE legal_name ILIKE '%medi%'
   OR legal_name ILIKE '%clinic%'
   OR legal_name ILIKE '%control%'
   OR id = (SELECT id FROM organizations LIMIT 1);
SQL

# 3. Verificar slug
echo "✅ Verificando slug asignado..."
npx prisma db execute --stdin <<'SQL'
SELECT id, legal_name, slug, org_type
FROM organizations
WHERE slug IS NOT NULL;
SQL

# 4. Verificar que Prisma Client está sincronizado
echo "🔄 Regenerando Prisma Client..."
npx prisma generate

echo ""
echo "✅ Deploy completado!"
echo ""
echo "🌐 URLs de prueba:"
echo "   Portal público:  https://medicontrol-web.onrender.com/reservar?slug=demo"
echo "   API doctores:    https://medicontrol-api-h9x3.onrender.com/api/v1/schedule/public/doctors?slug=demo"
echo "   API servicios:   https://medicontrol-api-h9x3.onrender.com/api/v1/schedule/public/services?slug=demo"
echo ""
echo "🧪 Para probar reserva completa:"
echo "   1. Obtén un doctorId: curl 'https://medicontrol-api-h9x3.onrender.com/api/v1/schedule/public/doctors?slug=demo'"
echo "   2. Obtén un serviceId: curl 'https://medicontrol-api-h9x3.onrender.com/api/v1/schedule/public/services?slug=demo'"
echo "   3. Obtén un branchId: curl 'https://medicontrol-api-h9x3.onrender.com/api/v1/admin/branches?organizationId=<ORG_ID>'"
echo "   4. POST a /public/appointments con esos IDs"
echo ""
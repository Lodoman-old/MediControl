import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const families = [
  { name: "Penicilinas", description: "Antibióticos betalactámicos derivados del hongo Penicillium" },
  { name: "Cefalosporinas", description: "Antibióticos betalactámicos de amplio espectro" },
  { name: "Macrólidos", description: "Antibióticos con anillo macrocíclico de lactona" },
  { name: "AINEs", description: "Antiinflamatorios no esteroideos" },
  { name: "Analgésicos", description: "Medicamentos para el alivio del dolor" },
  { name: "Antihistamínicos", description: "Medicamentos para alergias" },
  { name: "Inhibidores de bomba de protones", description: "Medicamentos para reducir ácido gástrico" },
  { name: "IECA", description: "Inhibidores de la enzima convertidora de angiotensina" },
  { name: "Biguanidas", description: "Antidiabéticos orales" },
  { name: "Fluoroquinolonas", description: "Antibióticos de amplio espectro" },
  { name: "Sulfonamidas", description: "Antibióticos bacteriostáticos" },
  { name: "Tetraciclinas", description: "Antibióticos bacteriostáticos de amplio espectro" },
  { name: "Antimicóticos", description: "Medicamentos antifúngicos" },
  { name: "Corticosteroides", description: "Antiinflamatorios esteroideos" },
  { name: "Benzodiacepinas", description: "Ansiolíticos y sedantes" },
  { name: "Antidepresivos", description: "Medicamentos para la depresión" },
  { name: "Anticonvulsivos", description: "Medicamentos antiepilépticos" },
  { name: "Broncodilatadores", description: "Medicamentos para el asma y EPOC" },
  { name: "Diuréticos", description: "Medicamentos para eliminar líquidos" },
  { name: "Anticoagulantes", description: "Medicamentos para prevenir coágulos" },
  { name: "Hipoglucemiantes orales", description: "Medicamentos para la diabetes tipo 2" },
  { name: "Hipotensores", description: "Medicamentos para la presión arterial" },
  { name: "Vitaminas y suplementos", description: "Complementos nutricionales" },
  { name: "Vacunas", description: "Biológicos para inmunización" },
  { name: "Soluciones intravenosas", description: "Líquidos para administración IV" },
  { name: "Antiparasitarios", description: "Medicamentos contra parásitos" },
  { name: "Relajantes musculares", description: "Medicamentos para espasmos musculares" },
  { name: "Antivirales", description: "Medicamentos contra virus" },
];

const medicamentoFamilies: Record<string, string[]> = {
  "Penicilinas": ["Amoxicilina"],
  "Macrólidos": ["Azitromicina"],
  "AINEs": ["Ibuprofeno"],
  "Analgésicos": ["Paracetamol"],
  "Antihistamínicos": ["Loratadina"],
  "Inhibidores de bomba de protones": ["Omeprazol"],
  "IECA": ["Enalapril"],
  "Biguanidas": ["Metformina"],
};

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No organization found. Run the main seed first.");
    process.exit(1);
  }
  const orgId = org.id;
  console.log(`Using organization: ${org.legalName} (${orgId})`);

  const createdFamilies: Record<string, string> = {};
  for (const f of families) {
    const family = await prisma.medicationFamily.upsert({
      where: { organizationId_name: { organizationId: orgId, name: f.name } },
      update: { description: f.description },
      create: { organizationId: orgId, name: f.name, description: f.description },
    });
    createdFamilies[f.name] = family.id;
  }
  console.log(`Created ${families.length} medication families`);

  let assignedCount = 0;
  for (const [familyName, drugNames] of Object.entries(medicamentoFamilies)) {
    const familyId = createdFamilies[familyName];
    if (!familyId) continue;
    for (const drugName of drugNames) {
      const meds = await prisma.medication.findMany({ where: { organizationId: orgId, name: { startsWith: drugName } } });
      for (const med of meds) {
        await prisma.medication.update({ where: { id: med.id }, data: { familyId } });
        assignedCount++;
      }
    }
  }
  console.log(`Assigned ${assignedCount} medications to families`);
  console.log("\nDone!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

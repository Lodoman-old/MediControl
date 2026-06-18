import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No organization found. Run the main seed first.");
    process.exit(1);
  }
  const orgId = org.id;
  console.log(`Using organization: ${org.legalName} (${orgId})`);

  const meds = [
    { sku: "PARAC-500", name: "Paracetamol", presentation: "Tableta 500mg", price: 35, requiresPrescription: false, activeIngredient: "Paracetamol", concentration: "500mg" },
    { sku: "IBU-400", name: "Ibuprofeno", presentation: "Tableta 400mg", price: 45, requiresPrescription: false, activeIngredient: "Ibuprofeno", concentration: "400mg" },
    { sku: "AMOX-500", name: "Amoxicilina", presentation: "Cápsula 500mg", price: 85, requiresPrescription: true, activeIngredient: "Amoxicilina", concentration: "500mg" },
    { sku: "LORAT-10", name: "Loratadina", presentation: "Tableta 10mg", price: 55, requiresPrescription: false, activeIngredient: "Loratadina", concentration: "10mg" },
    { sku: "OME-20", name: "Omeprazol", presentation: "Cápsula 20mg", price: 65, requiresPrescription: false, activeIngredient: "Omeprazol", concentration: "20mg" },
    { sku: "ENAL-10", name: "Enalapril", presentation: "Tableta 10mg", price: 70, requiresPrescription: true, activeIngredient: "Enalapril", concentration: "10mg" },
    { sku: "METFO-850", name: "Metformina", presentation: "Tableta 850mg", price: 60, requiresPrescription: true, activeIngredient: "Metformina", concentration: "850mg" },
    { sku: "AZITRO-500", name: "Azitromicina", presentation: "Tableta 500mg", price: 150, requiresPrescription: true, activeIngredient: "Azitromicina", concentration: "500mg" },
  ];

  const medicationIds: string[] = [];
  for (const m of meds) {
    const med = await prisma.medication.upsert({
      where: { organizationId_sku: { organizationId: orgId, sku: m.sku } },
      update: { name: m.name, presentation: m.presentation, price: m.price, requiresPrescription: m.requiresPrescription, activeIngredient: m.activeIngredient, concentration: m.concentration },
      create: { organizationId: orgId, ...m, currency: "MXN" },
    });
    medicationIds.push(med.id);
    console.log(`  Medication: ${m.name}`);
  }

  const batches = [
    { medIdx: 0, batchNumber: "LOTE-PARAC-001", expiryDate: new Date("2027-06-01"), stock: 500, cost: 20 },
    { medIdx: 0, batchNumber: "LOTE-PARAC-002", expiryDate: new Date("2027-08-15"), stock: 300, cost: 22 },
    { medIdx: 1, batchNumber: "LOTE-IBU-001", expiryDate: new Date("2027-05-01"), stock: 200, cost: 28 },
    { medIdx: 2, batchNumber: "LOTE-AMOX-001", expiryDate: new Date("2027-04-01"), stock: 150, cost: 50 },
    { medIdx: 3, batchNumber: "LOTE-LORAT-001", expiryDate: new Date("2027-07-01"), stock: 250, cost: 32 },
    { medIdx: 4, batchNumber: "LOTE-OME-001", expiryDate: new Date("2027-09-01"), stock: 180, cost: 38 },
    { medIdx: 5, batchNumber: "LOTE-ENAL-001", expiryDate: new Date("2027-08-01"), stock: 200, cost: 40 },
    { medIdx: 6, batchNumber: "LOTE-METFO-001", expiryDate: new Date("2027-06-15"), stock: 300, cost: 35 },
    { medIdx: 7, batchNumber: "LOTE-AZITRO-001", expiryDate: new Date("2027-05-30"), stock: 100, cost: 90 },
  ];

  for (const b of batches) {
    const batch = await prisma.inventoryBatch.upsert({
      where: { organizationId_batchNumber_medicationId: { organizationId: orgId, batchNumber: b.batchNumber, medicationId: medicationIds[b.medIdx] } },
      update: { currentStock: b.stock, costPrice: b.cost, expiryDate: b.expiryDate },
      create: { organizationId: orgId, medicationId: medicationIds[b.medIdx], batchNumber: b.batchNumber, expiryDate: b.expiryDate, initialStock: b.stock, currentStock: b.stock, costPrice: b.cost },
    });
    console.log(`  Batch: ${b.batchNumber} (stock: ${b.stock})`);
  }

  console.log(`\nDone! ${meds.length} medications, ${batches.length} batches seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

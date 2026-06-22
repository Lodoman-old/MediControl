import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DrugEntry {
  sku: string;
  name: string;
  presentation: string;
  price: number;
  requiresPrescription: boolean;
  activeIngredient: string;
  concentration: string;
}

const groups: { name: string; description: string; families: { name: string; description: string; drugs: DrugEntry[] }[] }[] = [
  {
    name: "Antibióticos",
    description: "Medicamentos utilizados para tratar infecciones bacterianas",
    families: [
      {
        name: "Penicilinas",
        description: "Antibióticos betalactámicos derivados del hongo Penicillium. Contienen un anillo betalactámico en su estructura.",
        drugs: [
          { sku: "AMOX-500", name: "Amoxicilina", presentation: "Cápsula 500mg", price: 85, requiresPrescription: true, activeIngredient: "Amoxicilina", concentration: "500mg" },
          { sku: "AMOX-250", name: "Amoxicilina", presentation: "Suspensión 250mg/5ml", price: 65, requiresPrescription: true, activeIngredient: "Amoxicilina", concentration: "250mg/5ml" },
          { sku: "DICLOX-500", name: "Dicloxacilina", presentation: "Cápsula 500mg", price: 95, requiresPrescription: true, activeIngredient: "Dicloxacilina", concentration: "500mg" },
          { sku: "AMPIC-500", name: "Ampicilina", presentation: "Cápsula 500mg", price: 75, requiresPrescription: true, activeIngredient: "Ampicilina", concentration: "500mg" },
          { sku: "BENCIL-1M", name: "Bencilpenicilina", presentation: "Solución inyectable 1M UI", price: 45, requiresPrescription: true, activeIngredient: "Bencilpenicilina sódica", concentration: "1,000,000 UI" },
          { sku: "AMOX-CLAV-500", name: "Amoxicilina + Ác. Clavulánico", presentation: "Tableta 500/125mg", price: 180, requiresPrescription: true, activeIngredient: "Amoxicilina + Ácido clavulánico", concentration: "500/125mg" },
        ],
      },
      {
        name: "Cefalosporinas",
        description: "Antibióticos betalactámicos de amplio espectro, clasificados en generaciones",
        drugs: [
          { sku: "CEFAL-500", name: "Cefalexina", presentation: "Cápsula 500mg", price: 90, requiresPrescription: true, activeIngredient: "Cefalexina", concentration: "500mg" },
          { sku: "CEFTRIAX-1G", name: "Ceftriaxona", presentation: "Solución inyectable 1g", price: 120, requiresPrescription: true, activeIngredient: "Ceftriaxona", concentration: "1g" },
          { sku: "CEFUROX-500", name: "Cefuroxima", presentation: "Tableta 500mg", price: 150, requiresPrescription: true, activeIngredient: "Cefuroxima", concentration: "500mg" },
        ],
      },
      {
        name: "Macrólidos",
        description: "Antibióticos bacteriostáticos con anillo macrocíclico de lactona",
        drugs: [
          { sku: "AZITRO-500", name: "Azitromicina", presentation: "Tableta 500mg", price: 150, requiresPrescription: true, activeIngredient: "Azitromicina", concentration: "500mg" },
          { sku: "CLARITRO-500", name: "Claritromicina", presentation: "Tableta 500mg", price: 130, requiresPrescription: true, activeIngredient: "Claritromicina", concentration: "500mg" },
          { sku: "ERITRO-500", name: "Eritromicina", presentation: "Tableta 500mg", price: 110, requiresPrescription: true, activeIngredient: "Eritromicina", concentration: "500mg" },
        ],
      },
      {
        name: "Fluoroquinolonas",
        description: "Antibióticos de amplio espectro que inhiben la ADN girasa bacteriana",
        drugs: [
          { sku: "CIPRO-500", name: "Ciprofloxacino", presentation: "Tableta 500mg", price: 95, requiresPrescription: true, activeIngredient: "Ciprofloxacino", concentration: "500mg" },
          { sku: "LEVO-500", name: "Levofloxacino", presentation: "Tableta 500mg", price: 180, requiresPrescription: true, activeIngredient: "Levofloxacino", concentration: "500mg" },
          { sku: "MOXI-400", name: "Moxifloxacino", presentation: "Tableta 400mg", price: 250, requiresPrescription: true, activeIngredient: "Moxifloxacino", concentration: "400mg" },
        ],
      },
      {
        name: "Tetraciclinas",
        description: "Antibióticos bacteriostáticos de amplio espectro",
        drugs: [
          { sku: "DOXI-100", name: "Doxiciclina", presentation: "Cápsula 100mg", price: 85, requiresPrescription: true, activeIngredient: "Doxiciclina", concentration: "100mg" },
        ],
      },
      {
        name: "Sulfonamidas",
        description: "Antibióticos bacteriostáticos que inhiben la síntesis de ácido fólico",
        drugs: [
          { sku: "TMP-SMX-800", name: "Trimetoprim/Sulfametoxazol", presentation: "Tableta 160/800mg", price: 55, requiresPrescription: true, activeIngredient: "Trimetoprim + Sulfametoxazol", concentration: "160/800mg" },
        ],
      },
    ],
  },
  {
    name: "Antiinflamatorios",
    description: "Medicamentos que reducen la inflamación, el dolor y la fiebre",
    families: [
      {
        name: "AINEs",
        description: "Antiinflamatorios no esteroideos que inhiben COX-1 y COX-2",
        drugs: [
          { sku: "IBU-400", name: "Ibuprofeno", presentation: "Tableta 400mg", price: 45, requiresPrescription: false, activeIngredient: "Ibuprofeno", concentration: "400mg" },
          { sku: "IBU-600", name: "Ibuprofeno", presentation: "Tableta 600mg", price: 55, requiresPrescription: false, activeIngredient: "Ibuprofeno", concentration: "600mg" },
          { sku: "NAPROX-500", name: "Naproxeno", presentation: "Tableta 500mg", price: 70, requiresPrescription: false, activeIngredient: "Naproxeno", concentration: "500mg" },
          { sku: "DICLOF-100", name: "Diclofenaco", presentation: "Tableta 100mg", price: 50, requiresPrescription: false, activeIngredient: "Diclofenaco sódico", concentration: "100mg" },
          { sku: "PIROX-20", name: "Piroxicam", presentation: "Cápsula 20mg", price: 65, requiresPrescription: false, activeIngredient: "Piroxicam", concentration: "20mg" },
          { sku: "MELOX-15", name: "Meloxicam", presentation: "Tableta 15mg", price: 75, requiresPrescription: false, activeIngredient: "Meloxicam", concentration: "15mg" },
          { sku: "CELECOX-200", name: "Celecoxib", presentation: "Cápsula 200mg", price: 160, requiresPrescription: true, activeIngredient: "Celecoxib", concentration: "200mg" },
        ],
      },
      {
        name: "Corticosteroides",
        description: "Antiinflamatorios esteroideos derivados del cortisol",
        drugs: [
          { sku: "PREDNIS-20", name: "Prednisona", presentation: "Tableta 20mg", price: 40, requiresPrescription: true, activeIngredient: "Prednisona", concentration: "20mg" },
          { sku: "DEXA-8", name: "Dexametasona", presentation: "Tableta 8mg", price: 60, requiresPrescription: true, activeIngredient: "Dexametasona", concentration: "8mg" },
          { sku: "HIDROCORT-100", name: "Hidrocortisona", presentation: "Solución inyectable 100mg", price: 85, requiresPrescription: true, activeIngredient: "Hidrocortisona", concentration: "100mg" },
        ],
      },
    ],
  },
  {
    name: "Analgésicos",
    description: "Medicamentos para el alivio del dolor",
    families: [
      {
        name: "No opioides",
        description: "Analgésicos que no actúan sobre receptores opioides",
        drugs: [
          { sku: "PARAC-500", name: "Paracetamol", presentation: "Tableta 500mg", price: 35, requiresPrescription: false, activeIngredient: "Paracetamol", concentration: "500mg" },
          { sku: "PARAC-INF", name: "Paracetamol", presentation: "Solución infantil 100mg/ml", price: 45, requiresPrescription: false, activeIngredient: "Paracetamol", concentration: "100mg/ml" },
          { sku: "METAMIZOL-500", name: "Metamizol", presentation: "Tableta 500mg", price: 40, requiresPrescription: false, activeIngredient: "Metamizol sódico", concentration: "500mg" },
        ],
      },
      {
        name: "Opioides débiles",
        description: "Analgésicos que actúan sobre receptores opioides mu, de baja potencia",
        drugs: [
          { sku: "TRAMADOL-50", name: "Tramadol", presentation: "Cápsula 50mg", price: 90, requiresPrescription: true, activeIngredient: "Tramadol", concentration: "50mg" },
          { sku: "CODEINA-30", name: "Codeína", presentation: "Tableta 30mg", price: 75, requiresPrescription: true, activeIngredient: "Codeína", concentration: "30mg" },
        ],
      },
      {
        name: "Opioides fuertes",
        description: "Analgésicos opioides de alta potencia, uso controlado",
        drugs: [
          { sku: "MORFINA-10", name: "Morfina", presentation: "Solución inyectable 10mg/ml", price: 120, requiresPrescription: true, activeIngredient: "Morfina", concentration: "10mg/ml" },
          { sku: "FENTANILO-100", name: "Fentanilo", presentation: "Parche transdérmico 100mcg/h", price: 350, requiresPrescription: true, activeIngredient: "Fentanilo", concentration: "100mcg/h" },
        ],
      },
    ],
  },
  {
    name: "Antihipertensivos",
    description: "Medicamentos para el control de la presión arterial",
    families: [
      {
        name: "IECA",
        description: "Inhibidores de la enzima convertidora de angiotensina",
        drugs: [
          { sku: "ENAL-10", name: "Enalapril", presentation: "Tableta 10mg", price: 70, requiresPrescription: true, activeIngredient: "Enalapril", concentration: "10mg" },
          { sku: "LISINOP-10", name: "Lisinopril", presentation: "Tableta 10mg", price: 80, requiresPrescription: true, activeIngredient: "Lisinopril", concentration: "10mg" },
          { sku: "CAPTO-25", name: "Captopril", presentation: "Tableta 25mg", price: 50, requiresPrescription: true, activeIngredient: "Captopril", concentration: "25mg" },
        ],
      },
      {
        name: "ARA II",
        description: "Antagonistas de los receptores de angiotensina II",
        drugs: [
          { sku: "LOSART-50", name: "Losartán", presentation: "Tableta 50mg", price: 75, requiresPrescription: true, activeIngredient: "Losartán", concentration: "50mg" },
          { sku: "VALSART-80", name: "Valsartán", presentation: "Tableta 80mg", price: 95, requiresPrescription: true, activeIngredient: "Valsartán", concentration: "80mg" },
        ],
      },
      {
        name: "Beta-bloqueadores",
        description: "Bloqueadores de receptores beta-adrenérgicos",
        drugs: [
          { sku: "ATENOL-50", name: "Atenolol", presentation: "Tableta 50mg", price: 55, requiresPrescription: true, activeIngredient: "Atenolol", concentration: "50mg" },
          { sku: "PROPRAN-40", name: "Propranolol", presentation: "Tableta 40mg", price: 45, requiresPrescription: true, activeIngredient: "Propranolol", concentration: "40mg" },
          { sku: "METOPRO-100", name: "Metoprolol", presentation: "Tableta 100mg", price: 65, requiresPrescription: true, activeIngredient: "Metoprolol", concentration: "100mg" },
        ],
      },
      {
        name: "Calcio-antagonistas",
        description: "Bloqueadores de los canales de calcio",
        drugs: [
          { sku: "AMLODIP-5", name: "Amlodipino", presentation: "Tableta 5mg", price: 60, requiresPrescription: true, activeIngredient: "Amlodipino", concentration: "5mg" },
        ],
      },
      {
        name: "Diuréticos",
        description: "Medicamentos que aumentan la excreción de sodio y agua",
        drugs: [
          { sku: "HCTZ-25", name: "Hidroclorotiazida", presentation: "Tableta 25mg", price: 35, requiresPrescription: true, activeIngredient: "Hidroclorotiazida", concentration: "25mg" },
          { sku: "FURO-40", name: "Furosemida", presentation: "Tableta 40mg", price: 40, requiresPrescription: true, activeIngredient: "Furosemida", concentration: "40mg" },
        ],
      },
    ],
  },
  {
    name: "Antidiabéticos",
    description: "Medicamentos para el control de la diabetes mellitus",
    families: [
      {
        name: "Biguanidas",
        description: "Antidiabéticos orales que disminuyen la producción hepática de glucosa",
        drugs: [
          { sku: "METFO-850", name: "Metformina", presentation: "Tableta 850mg", price: 60, requiresPrescription: true, activeIngredient: "Metformina", concentration: "850mg" },
          { sku: "METFO-500", name: "Metformina", presentation: "Tableta 500mg", price: 45, requiresPrescription: true, activeIngredient: "Metformina", concentration: "500mg" },
        ],
      },
      {
        name: "Sulfonilureas",
        description: "Antidiabéticos orales que estimulan la secreción de insulina",
        drugs: [
          { sku: "GLIBEN-5", name: "Glibenclamida", presentation: "Tableta 5mg", price: 40, requiresPrescription: true, activeIngredient: "Glibenclamida", concentration: "5mg" },
        ],
      },
    ],
  },
  {
    name: "Antihistamínicos",
    description: "Medicamentos para el tratamiento de alergias",
    families: [
      {
        name: "Antihistamínicos 1ra gen",
        description: "Antihistamínicos H1 de primera generación, atraviesan BHE",
        drugs: [
          { sku: "DIFEN-25", name: "Difenhidramina", presentation: "Cápsula 25mg", price: 30, requiresPrescription: false, activeIngredient: "Difenhidramina", concentration: "25mg" },
        ],
      },
      {
        name: "Antihistamínicos 2da gen",
        description: "Antihistamínicos H1 de segunda generación, no atraviesan BHE",
        drugs: [
          { sku: "LORAT-10", name: "Loratadina", presentation: "Tableta 10mg", price: 55, requiresPrescription: false, activeIngredient: "Loratadina", concentration: "10mg" },
          { sku: "CETI-10", name: "Cetirizina", presentation: "Tableta 10mg", price: 60, requiresPrescription: false, activeIngredient: "Cetirizina", concentration: "10mg" },
          { sku: "FEXO-120", name: "Fexofenadina", presentation: "Tableta 120mg", price: 90, requiresPrescription: false, activeIngredient: "Fexofenadina", concentration: "120mg" },
        ],
      },
    ],
  },
  {
    name: "Gastrointestinales",
    description: "Medicamentos para trastornos del sistema digestivo",
    families: [
      {
        name: "Inhibidores de bomba de protones",
        description: "Reducen la producción de ácido gástrico bloqueando la bomba H+/K+ ATPasa",
        drugs: [
          { sku: "OME-20", name: "Omeprazol", presentation: "Cápsula 20mg", price: 65, requiresPrescription: false, activeIngredient: "Omeprazol", concentration: "20mg" },
          { sku: "PANTO-40", name: "Pantoprazol", presentation: "Tableta 40mg", price: 80, requiresPrescription: false, activeIngredient: "Pantoprazol", concentration: "40mg" },
          { sku: "ESOMEP-40", name: "Esomeprazol", presentation: "Cápsula 40mg", price: 110, requiresPrescription: false, activeIngredient: "Esomeprazol", concentration: "40mg" },
        ],
      },
      {
        name: "Antieméticos",
        description: "Medicamentos para prevenir y tratar náuseas y vómito",
        drugs: [
          { sku: "ONDANSET-8", name: "Ondansetrón", presentation: "Tableta 8mg", price: 95, requiresPrescription: true, activeIngredient: "Ondansetrón", concentration: "8mg" },
          { sku: "METOCLO-10", name: "Metoclopramida", presentation: "Tableta 10mg", price: 35, requiresPrescription: false, activeIngredient: "Metoclopramida", concentration: "10mg" },
        ],
      },
    ],
  },
  {
    name: "Respiratorios",
    description: "Medicamentos para enfermedades del aparato respiratorio",
    families: [
      {
        name: "Broncodilatadores beta2",
        description: "Agonistas beta2-adrenérgicos de acción corta y larga",
        drugs: [
          { sku: "SALBU-100", name: "Salbutamol", presentation: "Inhalador 100mcg/dosis", price: 80, requiresPrescription: true, activeIngredient: "Salbutamol", concentration: "100mcg/dosis" },
        ],
      },
      {
        name: "Corticoides inhalados",
        description: "Corticosteroides para administración inhalada en asma y EPOC",
        drugs: [
          { sku: "BUDES-200", name: "Budesonida", presentation: "Inhalador 200mcg/dosis", price: 160, requiresPrescription: true, activeIngredient: "Budesonida", concentration: "200mcg/dosis" },
        ],
      },
    ],
  },
  {
    name: "Psicofármacos",
    description: "Medicamentos para trastornos mentales y del sistema nervioso",
    families: [
      {
        name: "ISRS",
        description: "Inhibidores selectivos de la recaptura de serotonina",
        drugs: [
          { sku: "FLUOX-20", name: "Fluoxetina", presentation: "Cápsula 20mg", price: 65, requiresPrescription: true, activeIngredient: "Fluoxetina", concentration: "20mg" },
          { sku: "SERTRA-50", name: "Sertralina", presentation: "Tableta 50mg", price: 80, requiresPrescription: true, activeIngredient: "Sertralina", concentration: "50mg" },
          { sku: "CITALO-20", name: "Escitalopram", presentation: "Tableta 20mg", price: 110, requiresPrescription: true, activeIngredient: "Escitalopram", concentration: "20mg" },
        ],
      },
      {
        name: "Benzodiacepinas",
        description: "Ansiolíticos y sedantes que potencian el efecto del GABA",
        drugs: [
          { sku: "ALPRAZ-0.5", name: "Alprazolam", presentation: "Tableta 0.5mg", price: 50, requiresPrescription: true, activeIngredient: "Alprazolam", concentration: "0.5mg" },
          { sku: "CLONA-2", name: "Clonazepam", presentation: "Tableta 2mg", price: 55, requiresPrescription: true, activeIngredient: "Clonazepam", concentration: "2mg" },
          { sku: "DIAZEP-10", name: "Diazepam", presentation: "Tableta 10mg", price: 45, requiresPrescription: true, activeIngredient: "Diazepam", concentration: "10mg" },
        ],
      },
    ],
  },
  {
    name: "Anticonvulsivos",
    description: "Medicamentos para el tratamiento de la epilepsia y trastornos convulsivos",
    families: [
      {
        name: "Antiepilépticos clásicos",
        description: "Anticonvulsivos de primera generación",
        drugs: [
          { sku: "AC-VALPRO-500", name: "Ácido Valproico", presentation: "Tableta 500mg", price: 85, requiresPrescription: true, activeIngredient: "Ácido valproico", concentration: "500mg" },
        ],
      },
      {
        name: "Antiepilépticos modernos",
        description: "Anticonvulsivos de nueva generación",
        drugs: [
          { sku: "GABAP-300", name: "Gabapentina", presentation: "Cápsula 300mg", price: 95, requiresPrescription: true, activeIngredient: "Gabapentina", concentration: "300mg" },
          { sku: "PREGABA-75", name: "Pregabalina", presentation: "Cápsula 75mg", price: 140, requiresPrescription: true, activeIngredient: "Pregabalina", concentration: "75mg" },
        ],
      },
    ],
  },
  {
    name: "Anticoagulantes",
    description: "Medicamentos que previenen la formación de coágulos sanguíneos",
    families: [
      {
        name: "Heparinas",
        description: "Anticoagulantes parenterales de acción rápida",
        drugs: [
          { sku: "ENOXA-40", name: "Enoxaparina", presentation: "Solución inyectable 40mg", price: 280, requiresPrescription: true, activeIngredient: "Enoxaparina sódica", concentration: "40mg" },
        ],
      },
      {
        name: "Antivitamina K",
        description: "Anticoagulantes orales que antagonizan la vitamina K",
        drugs: [
          { sku: "WARFAR-5", name: "Warfarina", presentation: "Tableta 5mg", price: 40, requiresPrescription: true, activeIngredient: "Warfarina", concentration: "5mg" },
        ],
      },
    ],
  },
  {
    name: "Hipolipemiantes",
    description: "Medicamentos para reducir los niveles de lípidos en sangre",
    families: [
      {
        name: "Estatinas",
        description: "Inhibidores de la HMG-CoA reductasa para reducir colesterol",
        drugs: [
          { sku: "ATORVA-20", name: "Atorvastatina", presentation: "Tableta 20mg", price: 90, requiresPrescription: true, activeIngredient: "Atorvastatina", concentration: "20mg" },
          { sku: "SIMVA-20", name: "Simvastatina", presentation: "Tableta 20mg", price: 60, requiresPrescription: true, activeIngredient: "Simvastatina", concentration: "20mg" },
          { sku: "ROSUVA-10", name: "Rosuvastatina", presentation: "Tableta 10mg", price: 130, requiresPrescription: true, activeIngredient: "Rosuvastatina", concentration: "10mg" },
        ],
      },
    ],
  },
];

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) { console.error("No organization found"); process.exit(1); }
  const orgId = org.id;
  console.log(`Organization: ${org.legalName}`);

  for (const g of groups) {
    const group = await prisma.medicationGroup.upsert({
      where: { organizationId_name: { organizationId: orgId, name: g.name } },
      update: { description: g.description },
      create: { organizationId: orgId, name: g.name, description: g.description },
    });
    console.log(`  Group: ${group.name}`);

    for (const f of g.families) {
      const family = await prisma.medicationFamily.upsert({
        where: { organizationId_name: { organizationId: orgId, name: f.name } },
        update: { description: f.description, groupId: group.id },
        create: { organizationId: orgId, groupId: group.id, name: f.name, description: f.description },
      });

      for (const d of f.drugs) {
        await prisma.medication.upsert({
          where: { organizationId_sku: { organizationId: orgId, sku: d.sku } },
          update: { familyId: family.id, name: d.name, presentation: d.presentation, price: d.price, requiresPrescription: d.requiresPrescription, activeIngredient: d.activeIngredient, concentration: d.concentration },
          create: { organizationId: orgId, familyId: family.id, ...d, currency: "MXN" },
        });
      }
    }
  }

  const count = await prisma.medication.count({ where: { organizationId: orgId } });
  console.log(`\nDone! ${groups.length} groups, families, ${count} medications`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

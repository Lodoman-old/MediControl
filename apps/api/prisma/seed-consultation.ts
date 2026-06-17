import { PrismaClient, AppointmentStatus, DiagnosisType, DiagnosisStatus, TreatmentType, TreatmentStatus, ConsentType, StudyType, LabOrderStatus, PrescriptionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo consultation data...\n");

  const orgId = "00000000-0000-0000-0000-000000000001";
  const branchId = "00000000-0000-0000-0000-000000000010";
  const slId = "00000000-0000-0000-0000-000000000020";

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    console.error("Organization not found. Run the main seed first.");
    process.exit(1);
  }

  const patient = await prisma.patient.findUnique({ where: { organizationId_mrn: { organizationId: orgId, mrn: "MCN-000001" } } });
  if (!patient) {
    console.error("Patient MCN-000001 not found. Run the main seed first.");
    process.exit(1);
  }

  const doctor = await prisma.doctor.findUnique({ where: { organizationId_cedulaProfesional: { organizationId: orgId, cedulaProfesional: "1234567" } } });
  if (!doctor) {
    console.error("Doctor (cedula 1234567) not found. Run the main seed first.");
    process.exit(1);
  }

  const doctorUser = await prisma.user.findUnique({ where: { id: doctor.userId } });
  if (!doctorUser) throw new Error("Doctor user not found");

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error("Branch not found");

  const service = await prisma.service.findUnique({ where: { organizationId_code: { organizationId: orgId, code: "GEN-CONSULT" } } });
  if (!service) throw new Error("Service GEN-CONSULT not found");

  const serviceLocation = await prisma.serviceLocation.findUnique({ where: { id: slId } });
  if (!serviceLocation) throw new Error("ServiceLocation not found");

  console.log("Found patient:", patient.id);
  console.log("Found doctor:", doctor.id);
  console.log("Found service:", service.id);

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 3);
  yesterday.setHours(10, 0, 0, 0);

  const appointmentEnd = new Date(yesterday);
  appointmentEnd.setMinutes(appointmentEnd.getMinutes() + service.durationMin);

  const appointment = await prisma.appointment.create({
    data: {
      organizationId: orgId,
      branchId,
      serviceLocationId: slId,
      doctorId: doctor.id,
      patientId: patient.id,
      serviceId: service.id,
      startsAt: yesterday,
      endsAt: appointmentEnd,
      status: AppointmentStatus.COMPLETED,
      reason: "Cefalea persistente de 3 semanas, revision general",
      channel: "RECEPTION",
      priceQuoted: service.defaultPrice,
      currency: "MXN",
      createdByUserId: doctorUser.id,
    },
  });
  console.log("Appointment created:", appointment.id);

  const record = await prisma.medicalRecord.upsert({
    where: { patientId: patient.id },
    update: {},
    create: {
      organizationId: orgId,
      patientId: patient.id,
      familyHistory: "Diabetes tipo 2: Madre (diagnosticada a los 55 años)\nHipertensión arterial: Padre\nCáncer de colon: Abuelo paterno",
      nonPathologicalHistory: "Tabaquismo: Negado\nAlcoholismo: Ocasional (fines de semana)\nActividad física: Sedentario\nAlimentación: Regular, alta en carbohidratos",
      pathologicalHistory: "Cirugías: Amigdalectomía (1998)\nEnfermedades crónicas: Asma leve diagnosticada en infancia\nAlergias: Penicilinas (urticaria)",
      currentIllness: "Paciente femenino de 36 años que acude a consulta por cefalea tensional de 3 semanas de evolución. Refiere dolor bilateral de intensidad 6/10 que empeora al final del día. Asociado a estrés laboral y mal descanso nocturno. Niega fiebre, náuseas o fotofobia. Ha tomado paracetamol 500mg cada 8 horas con mejoría parcial.",
      systemsReview: "Neurológico: Cefalea tensional, sin datos de focalización\nCardiovascular: Normal, sin palpitaciones\nRespiratorio: Sibilancias ocasionales en invierno, actualmente asintomático\nDigestivo: Pirosis ocasional, tolera alimentos\nMúsculo-esquelético: Contractura cervical leve",
    },
  });
  console.log("Medical record ready:", record.id);

  const vitals = await prisma.vitalSign.create({
    data: {
      organizationId: orgId,
      appointmentId: appointment.id,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 78,
      respiratoryRate: 16,
      temperature: 36.6,
      oxygenSaturation: 97,
      weight: 68.5,
      height: 1.62,
      glucose: 95,
      notes: "Paciente tranquila, signos vitales dentro de parámetros normales",
    },
  });
  console.log("Vital signs created:", vitals.id);

  const note = await prisma.clinicalNote.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      appointmentId: appointment.id,
      noteDate: yesterday,
      subjective: "Paciente refiere cefalea bifrontal de 3 semanas, empeora con estrés. Ha tomado paracetamol cada 8h con alivio parcial. Refiere mala calidad de sueño y contractura cervical.",
      objective: "Signos vitales normales (PA 120/80, FC 78, FR 16, Temp 36.6°C, SpO2 97%). A la exploración: cuello con contractura leve de trapecios bilateral. Neurológico: Glasgow 15/15, pupilas isocóricas normorreactivas, fondo de ojo normal. Resto de exploración sin alteraciones.",
      assessment: "Cefalea tensional episódica. Contractura muscular cervical secundaria. Asma leve intermitente en remisión.",
      plan: "1. Naproxeno 550mg VO cada 12h por 7 días\n2. Método de relajación muscular progresiva\n3. Fisioterapia cervical 2 sesiones/semana por 2 semanas\n4. Control en 2 semanas",
      createdById: doctorUser.id,
    },
  });
  console.log("Clinical note created:", note.id);

  const diagnosis1 = await prisma.diagnosis.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      appointmentId: appointment.id,
      icd10Code: "G44.2",
      description: "Cefalea tensional episódica",
      type: DiagnosisType.PRINCIPAL,
      status: DiagnosisStatus.ACTIVE,
      diagnosedById: doctorUser.id,
      diagnosedAt: yesterday,
    },
  });
  const diagnosis2 = await prisma.diagnosis.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      appointmentId: appointment.id,
      icd10Code: "M62.8",
      description: "Contractura muscular cervical",
      type: DiagnosisType.SECONDARY,
      status: DiagnosisStatus.ACTIVE,
      diagnosedById: doctorUser.id,
      diagnosedAt: yesterday,
    },
  });
  const diagnosis3 = await prisma.diagnosis.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      appointmentId: appointment.id,
      icd10Code: "J45.9",
      description: "Asma leve intermitente",
      type: DiagnosisType.SECONDARY,
      status: DiagnosisStatus.SUSPECTED,
      diagnosedById: doctorUser.id,
      diagnosedAt: yesterday,
    },
  });
  console.log("Diagnoses created:", diagnosis1.id, diagnosis2.id, diagnosis3.id);

  const treatment1 = await prisma.treatment.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      description: "Naproxeno 550mg VO cada 12h por 7 días",
      type: TreatmentType.PHARMACOLOGICAL,
      startDate: new Date(yesterday.getTime()),
      endDate: new Date(yesterday.getTime() + 7 * 24 * 60 * 60 * 1000),
      indications: "Tomar después de alimentos. No exceder 7 días. Suspender si presenta dolor epigástrico.",
      status: TreatmentStatus.ACTIVE,
      createdById: doctorUser.id,
    },
  });
  const treatment2 = await prisma.treatment.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      description: "Fisioterapia cervical - 4 sesiones",
      type: TreatmentType.NON_PHARMACOLOGICAL,
      startDate: new Date(yesterday.getTime()),
      endDate: new Date(yesterday.getTime() + 14 * 24 * 60 * 60 * 1000),
      indications: "2 sesiones por semana, incluir ultrasonido terapéutico y masaje descontracturante.",
      status: TreatmentStatus.ACTIVE,
      createdById: doctorUser.id,
    },
  });
  console.log("Treatments created:", treatment1.id, treatment2.id);

  const consent = await prisma.informedConsent.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      consentType: ConsentType.GENERAL,
      description: "Consentimiento informado general para consulta, exploración física y prescripción de tratamiento farmacológico y fisioterapéutico.",
      signedAt: yesterday,
    },
  });
  console.log("Consent created:", consent.id);

  const labOrder = await prisma.labOrder.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      studyType: StudyType.LABORATORY,
      studyName: "Biometría hemática completa",
      indication: "Descartar proceso infeccioso o anemia dada la cefalea persistente",
      status: LabOrderStatus.PENDING,
      orderedById: doctorUser.id,
      orderedAt: yesterday,
    },
  });
  const labOrder2 = await prisma.labOrder.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      studyType: StudyType.IMAGING,
      studyName: "Radiografía de columna cervical AP y lateral",
      indication: "Evaluar alineación cervical y descartar alteraciones estructurales",
      status: LabOrderStatus.PENDING,
      orderedById: doctorUser.id,
      orderedAt: yesterday,
    },
  });
  console.log("Lab orders created:", labOrder.id, labOrder2.id);

  const rx1 = await prisma.prescription.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      patientId: patient.id,
      doctorId: doctor.id,
      medication: "Naproxeno sódico 550 mg",
      dosage: "1 tableta cada 12 horas",
      frequency: "C/12H",
      duration: "7 días",
      route: "ORAL",
      quantity: 14,
      refills: 0,
      indications: "Después de alimentos. Suspender si presenta dolor abdominal o náuseas intensas.",
      status: PrescriptionStatus.ACTIVE,
      prescribedAt: yesterday,
    },
  });
  const rx2 = await prisma.prescription.create({
    data: {
      organizationId: orgId,
      medicalRecordId: record.id,
      patientId: patient.id,
      doctorId: doctor.id,
      medication: "Paracetamol 500 mg",
      dosage: "1 tableta cada 8 horas si dolor",
      frequency: "C/8H PRN",
      duration: "5 días",
      route: "ORAL",
      quantity: 15,
      refills: 0,
      indications: "Solo si dolor intenso a pesar de naproxeno. No exceder 3 tabletas al día.",
      status: PrescriptionStatus.ACTIVE,
      prescribedAt: yesterday,
    },
  });
  console.log("Prescriptions created:", rx1.id, rx2.id);

  console.log("\nDemo consultation data seeded successfully!");
  console.log("  Patient: Maria Garcia Rodriguez (MCN-000001)");
  console.log("  Doctor: Juan Perez Garcia");
  console.log("  Date: " + yesterday.toLocaleDateString("es-MX"));
  console.log("  Appointment: COMPLETED - Consulta General");
  console.log("  Items: vital signs, clinical note, 3 diagnoses, 2 treatments,");
  console.log("         1 consent, 2 lab orders, 2 prescriptions");
}

main()
  .catch((e) => {
    console.error("Error seeding consultation:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

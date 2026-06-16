import { PrismaClient, Gender, OrgType, UserStatus, ServiceLocationType } from "@prisma/client";
import { hash as argon2Hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const DEMO_ADMIN_EMAIL = "admin@medicontrol.mx";
const DEMO_ADMIN_PASSWORD = "Admin123!Demo";
const DEMO_DOCTOR_EMAIL = "doctor@medicontrol.mx";
const DEMO_DOCTOR_PASSWORD = "Doctor123!Demo";
  const DEMO_PATIENT_EMAIL = "paciente@medicontrol.mx";
  const DEMO_PATIENT_PASSWORD = "Paciente123!Demo";
  const DEMO_CAJERO_EMAIL = "cajero@medicontrol.mx";
  const DEMO_CAJERO_PASSWORD = "Cajero123!Demo";
  const DEMO_NURSE_EMAIL = "enfermera@medicontrol.mx";
  const DEMO_NURSE_PASSWORD = "Enfermera123!Demo";

async function main() {
  console.log("Seeding MediControl demo data...\n");

  const adminHash = await argon2Hash(DEMO_ADMIN_PASSWORD);
  const doctorHash = await argon2Hash(DEMO_DOCTOR_PASSWORD);
  const patientHash = await argon2Hash(DEMO_PATIENT_PASSWORD);
  const cajeroHash = await argon2Hash(DEMO_CAJERO_PASSWORD);
  const nurseHash = await argon2Hash(DEMO_NURSE_PASSWORD);

  const orgId = "00000000-0000-0000-0000-000000000001";

  // --- PERMISSIONS ---
  const allPermissions = [
    // Auth / Users
    { code: "users:read", resource: "users", action: "read", description: "Listar usuarios" },
    { code: "users:create", resource: "users", action: "create", description: "Crear usuarios" },
    { code: "users:update", resource: "users", action: "update", description: "Actualizar usuarios" },
    { code: "users:delete", resource: "users", action: "delete", description: "Eliminar usuarios" },
    { code: "users:reset-password", resource: "users", action: "reset-password", description: "Resetear contrasenas" },
    // Roles
    { code: "roles:read", resource: "roles", action: "read", description: "Listar roles" },
    { code: "roles:create", resource: "roles", action: "create", description: "Crear roles" },
    { code: "roles:update", resource: "roles", action: "update", description: "Actualizar roles" },
    { code: "roles:delete", resource: "roles", action: "delete", description: "Eliminar roles" },
    // Organization
    { code: "org:read", resource: "org", action: "read", description: "Ver datos de la organizacion" },
    { code: "org:update", resource: "org", action: "update", description: "Actualizar organizacion" },
    // Branches
    { code: "branches:read", resource: "branches", action: "read", description: "Listar sucursales" },
    { code: "branches:manage", resource: "branches", action: "manage", description: "Gestionar sucursales" },
    // Patients
    { code: "patients:read", resource: "patients", action: "read", description: "Ver pacientes" },
    { code: "patients:create", resource: "patients", action: "create", description: "Crear pacientes" },
    { code: "patients:update", resource: "patients", action: "update", description: "Actualizar pacientes" },
    // Appointments
    { code: "appointments:read", resource: "appointments", action: "read", description: "Ver citas" },
    { code: "appointments:create", resource: "appointments", action: "create", description: "Crear citas" },
    { code: "appointments:update", resource: "appointments", action: "update", description: "Actualizar citas" },
    { code: "appointments:cancel", resource: "appointments", action: "cancel", description: "Cancelar citas" },
    // Schedule
    { code: "schedule:read", resource: "schedule", action: "read", description: "Ver horarios" },
    { code: "schedule:manage", resource: "schedule", action: "manage", description: "Gestionar horarios" },
    // Clinical records
    { code: "clinical:read", resource: "clinical", action: "read", description: "Ver expediente clinico" },
    { code: "clinical:write", resource: "clinical", action: "write", description: "Editar expediente clinico" },
    { code: "clinical:note", resource: "clinical", action: "note", description: "Agregar notas de evolucion" },
    { code: "clinical:diagnosis", resource: "clinical", action: "diagnosis", description: "Gestionar diagnosticos" },
    { code: "clinical:treatment", resource: "clinical", action: "treatment", description: "Gestionar tratamientos" },
    { code: "clinical:lab", resource: "clinical", action: "lab", description: "Solicitar estudios" },
    { code: "clinical:consent", resource: "clinical", action: "consent", description: "Gestionar consentimientos" },
    { code: "clinical:vitals:write", resource: "clinical", action: "vitals:write", description: "Capturar signos vitales" },
    // Patient portal (Sprint 7)
    { code: "portal:read", resource: "portal", action: "read", description: "Ver portal del paciente" },
    { code: "portal:schedule", resource: "portal", action: "schedule", description: "Auto-agendar citas" },
    { code: "portal:profile", resource: "portal", action: "profile", description: "Actualizar perfil propio" },
    // Pharmacy / POS
    { code: "pharmacy:medications:read", resource: "pharmacy", action: "medications:read", description: "Ver medicamentos" },
    { code: "pharmacy:medications:create", resource: "pharmacy", action: "medications:create", description: "Crear medicamentos" },
    { code: "pharmacy:sales:create", resource: "pharmacy", action: "sales:create", description: "Realizar ventas" },
    { code: "pharmacy:sales:read", resource: "pharmacy", action: "sales:read", description: "Ver historial de ventas" },
    { code: "pharmacy:inventory:adjust", resource: "pharmacy", action: "inventory:adjust", description: "Ajustar inventario" },
    { code: "pharmacy:cash-register", resource: "pharmacy", action: "cash-register", description: "Gestionar caja" },
    { code: "pharmacy:reports", resource: "pharmacy", action: "reports", description: "Ver reportes de farmacia" },
  ];

  await prisma.permission.createMany({ skipDuplicates: true, data: allPermissions });
  const permissions = new Map(
    (await prisma.permission.findMany()).map((p) => [p.code, p.id]),
  );

  // --- ORGANIZATION ---
  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: {
      id: orgId,
      legalName: "Consultorio MediControl Demo S.C.",
      rfc: "MCD201201AB1",
      orgType: OrgType.CLINIC,
      fiscalAddress: { street: "Av. Reforma 222", ciudad: "Ciudad de Mexico", cp: "06600" },
    },
  });

  const branchId = "00000000-0000-0000-0000-000000000010";
  await prisma.branch.upsert({
    where: { id: branchId },
    update: {},
    create: {
      id: branchId,
      organizationId: orgId,
      code: "HQ",
      name: "Consultorio Principal",
      address: { street: "Av. Reforma 222", colonia: "Juarez", ciudad: "CDMX", cp: "06600" },
      phone: "+525512345678",
    },
  });

  const slId = "00000000-0000-0000-0000-000000000020";
  await prisma.serviceLocation.upsert({
    where: { id: slId },
    update: {},
    create: {
      id: slId,
      organizationId: orgId,
      branchId,
      code: "CONS-101",
      name: "Consultorio 101",
      locationType: "EXAM_ROOM",
      isActive: true,
    },
  });

  // --- ROLES ---
  const roleDefs = [
    { code: "SUPERADMIN", name: "Super Administrador" },
    { code: "ADMIN", name: "Administrador" },
    { code: "DOCTOR", name: "Medico" },
    { code: "RECEPTION", name: "Recepcionista" },
    { code: "NURSE", name: "Enfermero(a)" },
    { code: "CAJERO", name: "Cajero" },
    { code: "PATIENT", name: "Paciente" },
  ];

  const roles: Record<string, string> = {};
  for (const r of roleDefs) {
    const role = await prisma.role.upsert({
      where: { organizationId_code: { organizationId: orgId, code: r.code } },
      update: {},
      create: { organizationId: orgId, ...r },
    });
    roles[r.code] = role.id;
  }

  // --- ROLE-PERMISSION assignments ---
  const allPermIds = Array.from(permissions.values());

  // SUPERADMIN gets all
  await prisma.rolePermission.createMany({
    skipDuplicates: true,
    data: allPermIds.map((permId) => ({ roleId: roles["SUPERADMIN"]!, permissionId: permId })),
  });

  // ADMIN gets most (excluding delete)
  const adminCodes = allPermissions
    .filter((p) => !p.code.includes("delete"))
    .map((p) => permissions.get(p.code)!);
  await prisma.rolePermission.createMany({
    skipDuplicates: true,
    data: adminCodes.map((permId) => ({ roleId: roles["ADMIN"]!, permissionId: permId })),
  });

  // DOCTOR
  const doctorCodes = ["patients:read", "patients:create", "patients:update",
    "appointments:read", "appointments:create", "appointments:update",
    "schedule:read", "schedule:manage",
    "clinical:read", "clinical:write", "clinical:note", "clinical:diagnosis",
    "clinical:treatment", "clinical:lab", "clinical:consent", "clinical:vitals:write",
  ].map((c) => permissions.get(c)!);
  await prisma.rolePermission.createMany({
    skipDuplicates: true,
    data: doctorCodes.map((permId) => ({ roleId: roles["DOCTOR"]!, permissionId: permId })),
  });

  // RECEPTION
  const receptionCodes = ["patients:read", "appointments:read", "appointments:create",
    "appointments:update", "schedule:read", "clinical:read",
  ].map((c) => permissions.get(c)!);
  await prisma.rolePermission.createMany({
    skipDuplicates: true,
    data: receptionCodes.map((permId) => ({ roleId: roles["RECEPTION"]!, permissionId: permId })),
  });

  // NURSE
  const nurseCodes = ["patients:read", "appointments:read", "appointments:update",
    "clinical:read", "clinical:vitals:write",
  ].map((c) => permissions.get(c)!);
  await prisma.rolePermission.createMany({
    skipDuplicates: true,
    data: nurseCodes.map((permId) => ({ roleId: roles["NURSE"]!, permissionId: permId })),
  });

  // CAJERO — only pharmacy / POS
  const cajeroCodes = [
    "pharmacy:medications:read", "pharmacy:medications:create",
    "pharmacy:sales:create", "pharmacy:sales:read",
    "pharmacy:inventory:adjust", "pharmacy:cash-register",
    "pharmacy:reports",
  ].map((c) => permissions.get(c)!);
  await prisma.rolePermission.createMany({
    skipDuplicates: true,
    data: cajeroCodes.map((permId) => ({ roleId: roles["CAJERO"]!, permissionId: permId })),
  });

  // PATIENT
  const patientPermCodes = ["appointments:read", "portal:read", "portal:schedule", "portal:profile"].map((c) => permissions.get(c)!);
  await prisma.rolePermission.createMany({
    skipDuplicates: true,
    data: patientPermCodes.map((permId) => ({ roleId: roles["PATIENT"]!, permissionId: permId })),
  });

  // --- PERSONS & USERS ---

  // Admin
  const adminPerson = await prisma.person.upsert({
    where: { organizationId_curp: { organizationId: orgId, curp: "HELO850101HDFRRN01" } },
    update: {},
    create: {
      organizationId: orgId,
      firstName: "Carlos",
      lastNameP: "Hernandez",
      lastNameM: "Lopez",
      curp: "HELO850101HDFRRN01",
      birthDate: new Date("1985-01-01"),
      gender: Gender.M,
      nationality: "Mexicana",
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: orgId, email: DEMO_ADMIN_EMAIL } },
    update: { passwordHash: adminHash },
    create: {
      organizationId: orgId,
      personId: adminPerson.id,
      email: DEMO_ADMIN_EMAIL,
      phoneE164: "+525511111111",
      passwordHash: adminHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_branchId: { userId: adminUser.id, roleId: roles["SUPERADMIN"]!, branchId } },
    update: {},
    create: { organizationId: orgId, userId: adminUser.id, roleId: roles["SUPERADMIN"]!, branchId },
  });

  // Doctor
  const doctorPerson = await prisma.person.upsert({
    where: { organizationId_curp: { organizationId: orgId, curp: "PEGJ750515HDFRNS01" } },
    update: {},
    create: {
      organizationId: orgId,
      firstName: "Juan",
      lastNameP: "Perez",
      lastNameM: "Garcia",
      curp: "PEGJ750515HDFRNS01",
      birthDate: new Date("1975-05-15"),
      gender: Gender.M,
      nationality: "Mexicana",
    },
  });

  const doctorUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: orgId, email: DEMO_DOCTOR_EMAIL } },
    update: { passwordHash: doctorHash },
    create: {
      organizationId: orgId,
      personId: doctorPerson.id,
      email: DEMO_DOCTOR_EMAIL,
      phoneE164: "+525522222222",
      passwordHash: doctorHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_branchId: { userId: doctorUser.id, roleId: roles["DOCTOR"]!, branchId } },
    update: {},
    create: { organizationId: orgId, userId: doctorUser.id, roleId: roles["DOCTOR"]!, branchId },
  });

  await prisma.doctor.upsert({
    where: { organizationId_cedulaProfesional: { organizationId: orgId, cedulaProfesional: "1234567" } },
    update: {},
    create: {
      organizationId: orgId,
      userId: doctorUser.id,
      personId: doctorPerson.id,
      cedulaProfesional: "1234567",
      specialtyCode: "GEN",
    },
  });

  // Patient
  const patientPerson = await prisma.person.upsert({
    where: { organizationId_curp: { organizationId: orgId, curp: "MAGR900101MDFRRN01" } },
    update: {},
    create: {
      organizationId: orgId,
      firstName: "Maria",
      lastNameP: "Garcia",
      lastNameM: "Rodriguez",
      curp: "MAGR900101MDFRRN01",
      birthDate: new Date("1990-01-01"),
      gender: Gender.F,
      nationality: "Mexicana",
    },
  });

  const patientUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: orgId, email: DEMO_PATIENT_EMAIL } },
    update: { passwordHash: patientHash },
    create: {
      organizationId: orgId,
      personId: patientPerson.id,
      email: DEMO_PATIENT_EMAIL,
      phoneE164: "+525533333333",
      passwordHash: patientHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_branchId: { userId: patientUser.id, roleId: roles["PATIENT"]!, branchId } },
    update: {},
    create: { organizationId: orgId, userId: patientUser.id, roleId: roles["PATIENT"]!, branchId },
  });

  // Cashier
  const cajeroPerson = await prisma.person.upsert({
    where: { organizationId_curp: { organizationId: orgId, curp: "LOPR900101HDFRRN01" } },
    update: {},
    create: {
      organizationId: orgId,
      firstName: "Roberto",
      lastNameP: "Lopez",
      lastNameM: "Martinez",
      curp: "LOPR900101HDFRRN01",
      birthDate: new Date("1990-01-01"),
      gender: Gender.M,
      nationality: "Mexicana",
    },
  });

  const cajeroUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: orgId, email: DEMO_CAJERO_EMAIL } },
    update: { passwordHash: cajeroHash },
    create: {
      organizationId: orgId,
      personId: cajeroPerson.id,
      email: DEMO_CAJERO_EMAIL,
      phoneE164: "+525555555555",
      passwordHash: cajeroHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_branchId: { userId: cajeroUser.id, roleId: roles["CAJERO"]!, branchId } },
    update: {},
    create: { organizationId: orgId, userId: cajeroUser.id, roleId: roles["CAJERO"]!, branchId },
  });

  // Nurse
  const nursePerson = await prisma.person.upsert({
    where: { organizationId_curp: { organizationId: orgId, curp: "GARM850101MDFRRN02" } },
    update: {},
    create: {
      organizationId: orgId,
      firstName: "Maria",
      lastNameP: "Garcia",
      lastNameM: "Ramirez",
      curp: "GARM850101MDFRRN02",
      birthDate: new Date("1985-01-01"),
      gender: Gender.F,
      nationality: "Mexicana",
    },
  });

  const nurseUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: orgId, email: DEMO_NURSE_EMAIL } },
    update: { passwordHash: nurseHash },
    create: {
      organizationId: orgId,
      personId: nursePerson.id,
      email: DEMO_NURSE_EMAIL,
      phoneE164: "+525566666666",
      passwordHash: nurseHash,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_branchId: { userId: nurseUser.id, roleId: roles["NURSE"]!, branchId } },
    update: {},
    create: { organizationId: orgId, userId: nurseUser.id, roleId: roles["NURSE"]!, branchId },
  });

  await prisma.patient.upsert({
    where: { organizationId_mrn: { organizationId: orgId, mrn: "MCN-000001" } },
    update: {},
    create: {
      organizationId: orgId,
      userId: patientUser.id,
      personId: patientPerson.id,
      mrn: "MCN-000001",
      bloodType: "O+",
      emergencyContact: { name: "Pedro Garcia", phone: "+525544444444", relationship: "Hermano" },
      insurance: { provider: "GNP Seguros", policy: "GNP-12345-67890" },
    },
  });

  // --- SERVICES ---
  const serviceDefs = [
    { code: "GEN-CONSULT", name: "Consulta General", defaultPrice: 500, durationMin: 30 },
    { code: "SPEC-CONSULT", name: "Consulta de Especialidad", defaultPrice: 800, durationMin: 45 },
    { code: "FOLLOW-UP", name: "Consulta de Seguimiento", defaultPrice: 350, durationMin: 20 },
  ];

  for (const svc of serviceDefs) {
    await prisma.service.upsert({
      where: { organizationId_code: { organizationId: orgId, code: svc.code } },
      update: {},
      create: { organizationId: orgId, ...svc },
    });
  }

  // --- FEATURE FLAGS ---
  const flags = [
    { flagKey: "mfa_required", enabled: false, payload: { description: "Exigir MFA para todos los usuarios" } },
    { flagKey: "mercadopago_enabled", enabled: false, payload: { description: "Activar pagos con Mercado Pago" } },
    { flagKey: "whatsapp_notifications", enabled: false, payload: { description: "Notificaciones via WhatsApp" } },
    { flagKey: "email_notifications", enabled: true, payload: { description: "Notificaciones via email" } },
    { flagKey: "clinical_records", enabled: true, payload: { description: "Modulo de expediente clinico" } },
    { flagKey: "self_service", enabled: true, payload: { description: "Agenda de autocita para pacientes" } },
    { flagKey: "lab_integration", enabled: false, payload: { description: "Integracion con laboratorio externo" } },
    { flagKey: "digital_signature", enabled: false, payload: { description: "Firma electronica de recetas" } },
    { flagKey: "audit_log", enabled: true, payload: { description: "Bitacora de acceso y cambios" } },
  ];

  for (const f of flags) {
    await prisma.featureFlag.upsert({
      where: { organizationId_flagKey: { organizationId: orgId, flagKey: f.flagKey } },
      update: { enabled: f.enabled, payload: f.payload },
      create: { organizationId: orgId, ...f },
    });
  }

  // --- NOTIFICATION TEMPLATES ---
  const templates = [
    {
      code: "appointment_confirmation",
      name: "Confirmacion de Cita",
      channel: "EMAIL",
      type: "APPOINTMENT_CONFIRMED",
      subject: "Confirmacion de Cita - {{date}}",
      content: "<h2>Confirmacion de Cita</h2><p>Hola {{patientName}},</p><p>Tu cita con {{doctorName}} ha sido confirmada para el <strong>{{date}}</strong> a las <strong>{{time}}</strong>.</p><p>Servicio: {{service}}</p><p>Ubicacion: {{location}}</p>",
      variables: ["patientName", "doctorName", "date", "time", "service", "location"],
    },
    {
      code: "appointment_reminder",
      name: "Recordatorio de Cita",
      channel: "EMAIL",
      type: "APPOINTMENT_REMINDER",
      subject: "Recordatorio de Cita - {{date}}",
      content: "<h2>Recordatorio de Cita</h2><p>Hola {{patientName}},</p><p>Te recordamos que tienes una cita el <strong>{{date}}</strong> a las <strong>{{time}}</strong>.</p><p>Doctor: {{doctorName}}</p><p>Por favor llega 15 minutos antes.</p>",
      variables: ["patientName", "doctorName", "date", "time"],
    },
    {
      code: "payment_confirmation",
      name: "Confirmacion de Pago",
      channel: "EMAIL",
      type: "PAYMENT_CONFIRMED",
      subject: "Confirmacion de Pago - ${{amount}}",
      content: "<h2>Pago Confirmado</h2><p>Hola {{patientName}},</p><p>Tu pago por <strong>${{amount}} {{currency}}</strong> ha sido procesado exitosamente.</p><p>Metodo: {{method}}</p><p>Referencia: {{reference}}</p>",
      variables: ["patientName", "amount", "currency", "method", "reference"],
    },
    {
      code: "lab_result_ready",
      name: "Resultado de Laboratorio",
      channel: "EMAIL",
      type: "LAB_RESULT",
      subject: "Resultados de Laboratorio Disponibles",
      content: "<h2>Resultados de Laboratorio</h2><p>Hola {{patientName}},</p><p>Tus resultados de <strong>{{studyName}}</strong> ya estan disponibles.</p><p>Puedes consultarlos en tu portal de paciente.</p>",
      variables: ["patientName", "studyName"],
    },
    {
      code: "appointment_reminder_whatsapp",
      name: "Recordatorio de Cita WhatsApp",
      channel: "WHATSAPP",
      type: "APPOINTMENT_REMINDER",
      subject: null,
      content: "MediControl: Recordatorio de cita\nPaciente: {{patientName}}\nFecha: {{date}}\nHora: {{time}}\nDoctor: {{doctorName}}",
      variables: ["patientName", "doctorName", "date", "time"],
    },
    {
      code: "password_reset",
      name: "Recuperacion de Contrasena",
      channel: "EMAIL",
      type: "PASSWORD_RESET",
      subject: "Recuperacion de Contrasena - MediControl",
      content: "<h2>Recuperacion de Contrasena</h2><p>Hola {{fullName}},</p><p>Recibiste este correo porque solicitaste restablecer tu contrasena.</p><p>Haz clic en el siguiente enlace para crear una nueva contrasena:</p><p><a href=\"{{resetUrl}}\">{{resetUrl}}</a></p><p>Este enlace expira en 1 hora.</p><p>Si no solicitaste este cambio, ignora este mensaje.</p>",
      variables: ["fullName", "resetUrl"],
    },
    {
      code: "welcome_patient",
      name: "Bienvenida Paciente",
      channel: "EMAIL",
      type: "WELCOME",
      subject: "Bienvenido a MediControl",
      content: "<h2>Bienvenido a MediControl</h2><p>Hola {{fullName}},</p><p>Tu registro en MediControl ha sido exitoso.</p><p>Ya puedes agendar citas, consultar tu historial medico y mas desde tu portal.</p><p>Tu numero de expediente es: <strong>{{mrn}}</strong></p>",
      variables: ["fullName", "mrn"],
    },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { organizationId_code: { organizationId: orgId, code: t.code } },
      update: {},
      create: { organizationId: orgId, ...t },
    });
  }

  console.log(`Permissions seeded: ${allPermissions.length}`);
  console.log("Organization: Consultorio MediControl Demo S.C.");
  console.log("Branch: Consultorio Principal");
  console.log("ServiceLocation: Consultorio 101");
  console.log(`Roles seeded: ${roleDefs.length}`);
  console.log("Users seeded:");
  console.log(`  ADMIN  : ${DEMO_ADMIN_EMAIL}   / ${DEMO_ADMIN_PASSWORD}`);
  console.log(`  DOCTOR : ${DEMO_DOCTOR_EMAIL}  / ${DEMO_DOCTOR_PASSWORD}`);
  console.log(`  CAJERO : ${DEMO_CAJERO_EMAIL} / ${DEMO_CAJERO_PASSWORD}`);
  console.log(`  PATIENT: ${DEMO_PATIENT_EMAIL} / ${DEMO_PATIENT_PASSWORD}`);
  console.log("Services seeded: 3");
  // --- DEMO SCHEDULE (for patient portal) ---
  const doctorRecord = await prisma.doctor.findFirst({
    where: { organizationId: orgId, cedulaProfesional: "1234567" },
  });
  if (doctorRecord) {
    for (let day = 1; day <= 5; day++) {
      await prisma.schedule.upsert({
        where: { doctorId_dayOfWeek_serviceLocationId: { doctorId: doctorRecord.id, dayOfWeek: day, serviceLocationId: slId } },
        update: {},
        create: {
          organizationId: orgId,
          doctorId: doctorRecord.id,
          serviceLocationId: slId,
          dayOfWeek: day,
          startTime: new Date("1970-01-01T09:00:00Z"),
          endTime: new Date("1970-01-01T18:00:00Z"),
          slotDurationMin: 30,
          isActive: true,
        },
      });
    }
  }

  // --- MEDICATIONS ---
  const meds = [
    { sku: "PARAC-500", barcode: "7501234567891", name: "Paracetamol", presentation: "Tableta", activeIngredient: "Paracetamol", concentration: "500 mg", requiresPrescription: false, price: 35.00 },
    { sku: "IBU-400", barcode: "7501234567892", name: "Ibuprofeno", presentation: "Tableta", activeIngredient: "Ibuprofeno", concentration: "400 mg", requiresPrescription: false, price: 45.00 },
    { sku: "AMOX-500", barcode: "7501234567893", name: "Amoxicilina", presentation: "Capsula", activeIngredient: "Amoxicilina", concentration: "500 mg", requiresPrescription: true, price: 85.00 },
    { sku: "LORAT-10", barcode: "7501234567894", name: "Loratadina", presentation: "Tableta", activeIngredient: "Loratadina", concentration: "10 mg", requiresPrescription: false, price: 55.00 },
    { sku: "OME-20", barcode: "7501234567895", name: "Omeprazol", presentation: "Capsula", activeIngredient: "Omeprazol", concentration: "20 mg", requiresPrescription: false, price: 65.00 },
    { sku: "DEXA-8", barcode: "7501234567896", name: "Dexametasona", presentation: "Tableta", activeIngredient: "Dexametasona", concentration: "8 mg", requiresPrescription: true, price: 40.00 },
    { sku: "SALB-100", barcode: "7501234567897", name: "Salbutamol", presentation: "Inhalador", activeIngredient: "Salbutamol", concentration: "100 mcg/dosis", requiresPrescription: true, price: 120.00 },
    { sku: "ENAL-10", barcode: "7501234567898", name: "Enalapril", presentation: "Tableta", activeIngredient: "Enalapril", concentration: "10 mg", requiresPrescription: true, price: 70.00 },
    { sku: "METFO-850", barcode: "7501234567899", name: "Metformina", presentation: "Tableta", activeIngredient: "Metformina", concentration: "850 mg", requiresPrescription: true, price: 60.00 },
    { sku: "AZITRO-500", barcode: "7501234567800", name: "Azitromicina", presentation: "Tableta", activeIngredient: "Azitromicina", concentration: "500 mg", requiresPrescription: true, price: 150.00 },
  ];

  const medicationIds: string[] = [];
  for (const m of meds) {
    const medication = await prisma.medication.upsert({
      where: { organizationId_sku: { organizationId: orgId, sku: m.sku } },
      update: {},
      create: { organizationId: orgId, ...m, currency: "MXN" },
    });
    medicationIds.push(medication.id);
  }

  // --- INVENTORY BATCHES ---
  const now = new Date();
  const batchDefs = [
    { medicationIdx: 0, batchNumber: "LOTE-PARAC-001", expiryDate: new Date("2027-06-01"), initialStock: 500, costPrice: 20.00 },
    { medicationIdx: 0, batchNumber: "LOTE-PARAC-002", expiryDate: new Date("2027-08-15"), initialStock: 300, costPrice: 22.00 },
    { medicationIdx: 1, batchNumber: "LOTE-IBU-001", expiryDate: new Date("2027-05-01"), initialStock: 200, costPrice: 28.00 },
    { medicationIdx: 2, batchNumber: "LOTE-AMOX-001", expiryDate: new Date("2027-04-01"), initialStock: 150, costPrice: 50.00 },
    { medicationIdx: 3, batchNumber: "LOTE-LORAT-001", expiryDate: new Date("2027-07-01"), initialStock: 250, costPrice: 32.00 },
    { medicationIdx: 4, batchNumber: "LOTE-OME-001", expiryDate: new Date("2027-09-01"), initialStock: 180, costPrice: 38.00 },
    { medicationIdx: 5, batchNumber: "LOTE-DEXA-001", expiryDate: new Date("2027-03-01"), initialStock: 120, costPrice: 22.00 },
    { medicationIdx: 6, batchNumber: "LOTE-SALB-001", expiryDate: new Date("2027-10-01"), initialStock: 80, costPrice: 75.00 },
    { medicationIdx: 7, batchNumber: "LOTE-ENAL-001", expiryDate: new Date("2027-08-01"), initialStock: 200, costPrice: 40.00 },
    { medicationIdx: 8, batchNumber: "LOTE-METFO-001", expiryDate: new Date("2027-06-15"), initialStock: 300, costPrice: 35.00 },
    { medicationIdx: 9, batchNumber: "LOTE-AZITRO-001", expiryDate: new Date("2027-05-30"), initialStock: 100, costPrice: 90.00 },
  ];

  for (const b of batchDefs) {
    await prisma.inventoryBatch.upsert({
      where: { organizationId_batchNumber_medicationId: { organizationId: orgId, batchNumber: b.batchNumber, medicationId: medicationIds[b.medicationIdx] } },
      update: {},
      create: {
        organizationId: orgId,
        medicationId: medicationIds[b.medicationIdx],
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        initialStock: b.initialStock,
        currentStock: b.initialStock,
        costPrice: b.costPrice,
      },
    });
  }

  console.log(`Medications seeded: ${meds.length}`);
  console.log(`Inventory batches seeded: ${batchDefs.length}`);
  console.log(`Feature flags seeded: ${flags.length}`);
  console.log(`Notification templates seeded: ${templates.length}`);
  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

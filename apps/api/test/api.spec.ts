import request from "supertest";
import { getApp, closeApp, resolveDoctorId, resolvePatientId } from "./helpers";

let api: request.SuperTest<request.Test>;
let adminToken: string;
let doctorToken: string;
let patientToken: string;

// Shared test data (populated in tests, accessible to all)
let patientIdFromMe: string;
let branchId: string;
let medId: string;
let batchId: string;
let saleId: string;
let rxForDispense: string;
let medSku: string;

beforeAll(async () => {
  const app = await getApp();
  api = request(app.getHttpServer()) as any;
});

afterAll(async () => {
  await closeApp();
});

describe("Auth (e2e)", () => {
  it("POST /auth/login - admin succeeds", async () => {
    const res = await api
      .post("/api/v1/auth/login")
      .send({ email: "admin@medicontrol.mx", password: "Admin123!Demo" });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.user.email).toBe("admin@medicontrol.mx");
    adminToken = res.body.tokens.accessToken;
  });

  it("POST /auth/login - doctor succeeds", async () => {
    const res = await api
      .post("/api/v1/auth/login")
      .send({ email: "doctor@medicontrol.mx", password: "Doctor123!Demo" });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    doctorToken = res.body.tokens.accessToken;
  });

  it("POST /auth/login - patient succeeds", async () => {
    const res = await api
      .post("/api/v1/auth/login")
      .send({ email: "paciente@medicontrol.mx", password: "Paciente123!Demo" });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    patientToken = res.body.tokens.accessToken;
  });

  it("POST /auth/login - bad password returns 401", async () => {
    const res = await api
      .post("/api/v1/auth/login")
      .send({ email: "admin@medicontrol.mx", password: "WrongPass123" });
    expect(res.status).toBe(401);
  });

  it("GET /auth/me - returns profile", async () => {
    const res = await api
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("admin@medicontrol.mx");
  });

  it("GET /auth/me - no token returns 401", async () => {
    const res = await api.get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("POST /auth/refresh - rotates tokens", async () => {
    const loginRes = await api
      .post("/api/v1/auth/login")
      .send({ email: "admin@medicontrol.mx", password: "Admin123!Demo" });
    const refreshToken = loginRes.body.tokens.refreshToken;

    const res = await api
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
  });
});

describe("Admin (e2e)", () => {
  it("GET /admin/users - admin lists users", async () => {
    const res = await api
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  it("GET /admin/users - doctor forbidden", async () => {
    const res = await api
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /admin/branches - returns branch list", async () => {
    const res = await api
      .get("/api/v1/admin/branches")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Schedule (e2e)", () => {
  let scheduleId: string;

  it("GET /schedule - returns empty list initially", async () => {
    const res = await api
      .get("/api/v1/schedule")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /schedule - creates schedule", async () => {
    const doctorsRes = await api
      .get("/api/v1/admin/users?limit=5&role=DOCTOR")
      .set("Authorization", `Bearer ${adminToken}`);
    const user = doctorsRes.body.data?.[0];
    if (!user?.id) return;

    const doctorId = await resolveDoctorId(user.id);
    if (!doctorId) return;

    const res = await api
      .post("/api/v1/schedule")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        doctorId,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "18:00",
        slotDurationMin: 30,
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    scheduleId = res.body.id;
  });

  it("GET /schedule - lists created schedule", async () => {
    const res = await api
      .get("/api/v1/schedule")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    if (scheduleId) {
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("DELETE /schedule/:id - deletes schedule", async () => {
    if (!scheduleId) return;
    const res = await api
      .delete(`/api/v1/schedule/${scheduleId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe("Appointments (e2e)", () => {
  it("GET /appointments - returns empty list initially", async () => {
    const res = await api
      .get("/api/v1/appointments")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("GET /appointments/day/:date - returns day summary", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await api
      .get(`/api/v1/appointments/day/${today}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeDefined();
    expect(res.body.appointments).toBeDefined();
  });
});

describe("Health (e2e)", () => {
  it("GET /health - returns ok", async () => {
    const res = await api.get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Clinical Records (e2e)", () => {
  let patientId: string;
  let noteId: string;
  let diagnosisId: string;
  let treatmentId: string;

  it("GET /patients/me - returns patient record", async () => {
    const res = await api
      .get("/api/v1/patients/me")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.mrn).toBeDefined();
    patientId = res.body.id;
  });

  it("POST /clinical-records/:patientId/notes - doctor creates note", async () => {
    if (!patientId) return;
    const res = await api
      .post(`/api/v1/clinical-records/${patientId}/notes`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        noteDate: new Date().toISOString(),
        subjective: "Paciente refiere dolor de cabeza",
        objective: "Presion arterial 120/80",
        assessment: "Cefalea tensional probable",
        plan: "Reposo, hidratacion, paracetamol 500mg",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.subjective).toBe("Paciente refiere dolor de cabeza");
    noteId = res.body.id;
  });

  it("GET /clinical-records/:patientId/notes - lists notes", async () => {
    if (!patientId) return;
    const res = await api
      .get(`/api/v1/clinical-records/${patientId}/notes`)
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (noteId) expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /clinical-records/:patientId/diagnoses - doctor creates diagnosis", async () => {
    if (!patientId) return;
    const res = await api
      .post(`/api/v1/clinical-records/${patientId}/diagnoses`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        icd10Code: "G44.1",
        description: "Cefalea tensional",
        type: "PRINCIPAL",
        status: "ACTIVE",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.icd10Code).toBe("G44.1");
    diagnosisId = res.body.id;
  });

  it("PATCH /clinical-records/:patientId/diagnoses/:diagnosisId - updates status", async () => {
    if (!diagnosisId) return;
    const res = await api
      .patch(`/api/v1/clinical-records/${patientId}/diagnoses/${diagnosisId}`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ status: "RESOLVED" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("RESOLVED");
  });

  it("POST /clinical-records/:patientId/treatments - doctor creates treatment", async () => {
    if (!patientId) return;
    const res = await api
      .post(`/api/v1/clinical-records/${patientId}/treatments`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        description: "Paracetamol 500mg cada 8 horas por 7 dias",
        type: "PHARMACOLOGICAL",
        startDate: new Date().toISOString(),
        status: "ACTIVE",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    treatmentId = res.body.id;
  });

  it("PATCH /clinical-records/:patientId/treatments/:treatmentId - updates status", async () => {
    if (!treatmentId) return;
    const res = await api
      .patch(`/api/v1/clinical-records/${patientId}/treatments/${treatmentId}`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ status: "COMPLETED" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("COMPLETED");
  });

  it("POST /clinical-records/:patientId/notes - patient forbidden", async () => {
    if (!patientId) return;
    const res = await api
      .post(`/api/v1/clinical-records/${patientId}/notes`)
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        noteDate: new Date().toISOString(),
        subjective: "test",
      });
    expect(res.status).toBe(403);
  });

  it("GET /clinical-records/:patientId/notes - patient can read", async () => {
    if (!patientId) return;
    const res = await api
      .get(`/api/v1/clinical-records/${patientId}/notes`)
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /patients - admin lists patients", async () => {
    const res = await api
      .get("/api/v1/patients")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // --- DASHBOARD ---

  it("GET /dashboard/stats - returns stats", async () => {
    const res = await api
      .get("/api/v1/dashboard/stats")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.appointmentsToday).toBe("number");
    expect(typeof res.body.totalPatients).toBe("number");
    expect(typeof res.body.revenueToday).toBe("number");
    expect(Array.isArray(res.body.upcomingAppointments)).toBe(true);
  });

  it("GET /dashboard/stats - patient forbidden", async () => {
    const res = await api
      .get("/api/v1/dashboard/stats")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(403);
  });

  // --- PRESCRIPTIONS ---

  let prescriptionId: string;

  it("POST /prescriptions - doctor creates prescription", async () => {
    const res = await api
      .post("/api/v1/prescriptions")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        patientId,
        medication: "Paracetamol",
        dosage: "500mg",
        frequency: "Cada 8 horas",
        duration: "7 dias",
        route: "ORAL",
        quantity: 14,
        refills: 0,
        indications: "Tomar despues de alimentos",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.medication).toBe("Paracetamol");
    prescriptionId = res.body.id;
  });

  it("GET /prescriptions/patient/:patientId - lists prescriptions", async () => {
    if (!patientId) return;
    const res = await api
      .get(`/api/v1/prescriptions/patient/${patientId}`)
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (prescriptionId) expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /prescriptions/:id - gets prescription detail", async () => {
    if (!prescriptionId) return;
    const res = await api
      .get(`/api/v1/prescriptions/${prescriptionId}`)
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.medication).toBe("Paracetamol");
  });

  it("PATCH /prescriptions/:id - updates prescription status", async () => {
    if (!prescriptionId) return;
    const res = await api
      .patch(`/api/v1/prescriptions/${prescriptionId}`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ status: "COMPLETED" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("COMPLETED");
  });

  it("DELETE /prescriptions/:id - cancels prescription", async () => {
    if (!prescriptionId) return;
    const res = await api
      .delete(`/api/v1/prescriptions/${prescriptionId}`)
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });

  // --- REPORTS ---

  it("GET /reports/revenue - returns revenue report", async () => {
    const res = await api
      .get("/api/v1/reports/revenue")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe("number");
    expect(typeof res.body.count).toBe("number");
  });

  it("GET /reports/appointments - returns appointments report", async () => {
    const res = await api
      .get("/api/v1/reports/appointments")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe("number");
    expect(res.body.byStatus).toBeDefined();
  });

  it("GET /reports/patients - returns patients report", async () => {
    const res = await api
      .get("/api/v1/reports/patients")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.totalPatients).toBe("number");
    expect(typeof res.body.totalVisits).toBe("number");
  });

  it("GET /reports/doctors - returns doctors report", async () => {
    const res = await api
      .get("/api/v1/reports/doctors")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /reports/revenue - patient forbidden", async () => {
    const res = await api
      .get("/api/v1/reports/revenue")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(403);
  });

  // --- LAB INTEGRATION ---

  let labProviderId: string;

  it("POST /lab-integration/providers - creates lab provider", async () => {
    const res = await api
      .post("/api/v1/lab-integration/providers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        providerCode: "chopo",
        providerName: "Laboratorio Chopo",
        apiEndpoint: "https://api.chopo.example.com",
        isActive: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    labProviderId = res.body.id;
  });

  it("GET /lab-integration/providers - lists providers", async () => {
    const res = await api
      .get("/api/v1/lab-integration/providers")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("PATCH /lab-integration/providers/:id - updates provider", async () => {
    if (!labProviderId) return;
    const res = await api
      .patch(`/api/v1/lab-integration/providers/${labProviderId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ providerName: "Laboratorio Chopo (Actualizado)" });
    expect(res.status).toBe(200);
    expect(res.body.providerName).toContain("Actualizado");
  });

  it("POST /lab-integration/sync - syncs lab orders", async () => {
    const res = await api
      .post("/api/v1/lab-integration/sync")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(201);
    expect(res.body.synced).toBeGreaterThanOrEqual(0);
  });

  it("DELETE /lab-integration/providers/:id - deletes provider", async () => {
    if (!labProviderId) return;
    const res = await api
      .delete(`/api/v1/lab-integration/providers/${labProviderId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });

  it("POST /lab-integration/providers - doctor forbidden", async () => {
    const res = await api
      .post("/api/v1/lab-integration/providers")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        providerCode: "test",
        providerName: "Test",
        apiEndpoint: "https://test.com",
      });
    expect(res.status).toBe(403);
  });

  // --- PAYMENTS ---

  let paymentId: string;

  it("GET /patients/me - resolve patient ID for payments", async () => {
    const res = await api
      .get("/api/v1/patients/me")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    patientIdFromMe = res.body.id;
  });

  it("GET /admin/branches - resolve branch ID for payments", async () => {
    const res = await api
      .get("/api/v1/admin/branches")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    branchId = res.body.data[0].id;
  });

  it("POST /payments - creates cash payment", async () => {
    if (!patientIdFromMe || !branchId) return;
    const res = await api
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        branchId,
        patientId: patientIdFromMe,
        amount: 500,
        currency: "MXN",
        method: "CASH",
        notes: "Pago en efectivo por consulta",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("COMPLETED");
    paymentId = res.body.id;
  });

  it("GET /payments - lists payments", async () => {
    const res = await api
      .get("/api/v1/payments")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /payments/summary/daily - returns daily summary", async () => {
    const res = await api
      .get("/api/v1/payments/summary/daily")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe("number");
    expect(res.body.byMethod).toBeDefined();
  });

  it("GET /payments/:id - returns payment detail", async () => {
    if (!paymentId) return;
    const res = await api
      .get(`/api/v1/payments/${paymentId}`)
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(Number(res.body.amount)).toBe(500);
  });

  it("PATCH /payments/:id/status - updates payment status", async () => {
    if (!paymentId) return;
    const res = await api
      .patch(`/api/v1/payments/${paymentId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "REFUNDED", reference: "REF-001" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REFUNDED");
  });

  it("POST /payments - patient forbidden", async () => {
    if (!branchId || !patientIdFromMe) return;
    const res = await api
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        branchId,
        patientId: patientIdFromMe,
        amount: 100,
        method: "CASH",
      });
    expect(res.status).toBe(403);
  });

  // --- PHARMACY ---

  it("POST /pharmacy/medications - creates medication", async () => {
    medSku = `PARA-${Date.now()}`;
    const res = await api
      .post("/api/v1/pharmacy/medications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        sku: medSku,
        name: "Paracetamol 500mg",
        presentation: "Caja 20 tabletas",
        activeIngredient: "Paracetamol",
        concentration: "500mg",
        requiresPrescription: false,
        price: 45.50,
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    medId = res.body.id;
  });

  it("GET /pharmacy/medications - lists medications", async () => {
    const res = await api
      .get("/api/v1/pharmacy/medications")
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /pharmacy/medications/:id - updates medication", async () => {
    if (!medId) return;
    const res = await api
      .patch(`/api/v1/pharmacy/medications/${medId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 50 });
    expect(res.status).toBe(200);
    expect(Number(res.body.price)).toBe(50);
  });

  it("POST /pharmacy/batches - creates inventory batch", async () => {
    if (!medId) return;
    const res = await api
      .post("/api/v1/pharmacy/batches")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        medicationId: medId,
        batchNumber: "LOTE-001",
        expiryDate: "2027-12-31",
        initialStock: 100,
        costPrice: 25,
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.currentStock).toBe(100);
    batchId = res.body.id;
  });

  it("GET /pharmacy/batches - lists batches", async () => {
    const res = await api
      .get("/api/v1/pharmacy/batches")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /pharmacy/movements - adjusts stock (IN)", async () => {
    if (!batchId) return;
    const res = await api
      .post("/api/v1/pharmacy/movements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchId,
        type: "IN",
        quantity: 50,
        reason: "Reabastecimiento",
      });
    expect(res.status).toBe(201);
    expect(res.body.newStock).toBe(150);
  });

  it("POST /pharmacy/sales - creates sale", async () => {
    if (!medId || !batchId || !branchId) return;
    const res = await api
      .post("/api/v1/pharmacy/sales")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        branchId,
        patientId: patientIdFromMe,
        method: "CASH",
        items: [
          { medicationId: medId, batchId, quantity: 2, unitPrice: 50 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.items.length).toBe(1);
    expect(Number(res.body.total)).toBeGreaterThan(0);
    saleId = res.body.id;
  });

  it("GET /pharmacy/sales - lists sales", async () => {
    const res = await api
      .get("/api/v1/pharmacy/sales")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /pharmacy/sales/summary/daily - returns daily sales summary", async () => {
    const res = await api
      .get("/api/v1/pharmacy/sales/summary/daily")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe("number");
    expect(res.body.byMethod).toBeDefined();
  });

  it("GET /pharmacy/sales/:id - returns sale detail", async () => {
    if (!saleId) return;
    const res = await api
      .get(`/api/v1/pharmacy/sales/${saleId}`)
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
  });

  it("POST /pharmacy/dispensings - dispenses from prescription", async () => {
    if (!medId || !batchId || !patientIdFromMe) return;

    const rx = await api
      .post("/api/v1/prescriptions")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        patientId: patientIdFromMe,
        medication: "Paracetamol 500mg",
        dosage: "1 tableta",
        frequency: "Cada 8 horas",
        duration: "7 dias",
        quantity: 14,
      });
    expect(rx.status).toBe(201);
    rxForDispense = rx.body.id;

    const res = await api
      .post("/api/v1/pharmacy/dispensings")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        prescriptionId: rxForDispense,
        medicationId: medId,
        batchId,
        quantity: 5,
        instructions: "Tomar cada 8 horas",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.quantity).toBe(5);
  });

  it("GET /pharmacy/dispensings - lists dispensings", async () => {
    const res = await api
      .get("/api/v1/pharmacy/dispensings")
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /pharmacy/medications - patient forbidden to create", async () => {
    const res = await api
      .post("/api/v1/pharmacy/medications")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ sku: `TEST-${Date.now()}`, name: "Test", presentation: "Test", price: 10 });
    expect(res.status).toBe(403);
  });
});

// ============================================================================
// NEW FEATURES - F2/F3/F4/F5/F6/F7/F8
// ============================================================================

describe("Quick Patient Creation (F2)", () => {
  let quickPatientId: string;

  it("POST /patients/quick - reception creates quick patient", async () => {
    const res = await api
      .post("/api/v1/patients/quick")
      .set("Authorization", `Bearer ${adminToken}`) // admin has RECEPTION role
      .send({
        firstName: "Juan",
        lastNameP: "Perez",
        lastNameM: "Lopez",
        phone: "+525512345678",
        birthDate: "1990-01-15",
        gender: "M",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.mrn).toBeDefined();
    expect(res.body.fullName).toContain("Juan");
    expect(res.body.fullName).toContain("Perez");
    expect(res.body.phone).toBe("+525512345678");
    quickPatientId = res.body.id;
  });

  it("POST /patients/quick - doctor can create quick patient", async () => {
    const res = await api
      .post("/api/v1/patients/quick")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        firstName: "Maria",
        lastNameP: "Garcia",
        phone: "+525587654321",
        birthDate: "1985-05-20",
        gender: "F",
      });
    expect(res.status).toBe(201);
    expect(res.body.mrn).toBeDefined();
  });

  it("POST /patients/quick - patient forbidden", async () => {
    const res = await api
      .post("/api/v1/patients/quick")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        firstName: "Test",
        lastNameP: "User",
        phone: "+525500000000",
        birthDate: "2000-01-01",
        gender: "X",
      });
    expect(res.status).toBe(403);
  });

  it("POST /patients/quick - validation errors", async () => {
    const res = await api
      .post("/api/v1/patients/quick")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "",
        lastNameP: "Perez",
        phone: "invalid",
        birthDate: "not-a-date",
        gender: "Z",
      });
    expect(res.status).toBe(400);
  });

  it("GET /patients/:id - quick patient appears in list", async () => {
    if (!quickPatientId) return;
    const res = await api
      .get(`/api/v1/patients/${quickPatientId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(quickPatientId);
  });
});

describe("Cobrar from Appointment (F3)", () => {
  let appointmentForPayment: string;
  let patientForAppt: string;

  beforeAll(async () => {
    // Create a patient for appointment
    const p = await api
      .post("/api/v1/patients/quick")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Carlos",
        lastNameP: "Lopez",
        phone: "+525599998888",
        birthDate: "1992-03-10",
        gender: "M",
      });
    patientForAppt = p.body.id;

    // Create doctor schedule
    const doctorsRes = await api
      .get("/api/v1/admin/users?limit=5&role=DOCTOR")
      .set("Authorization", `Bearer ${adminToken}`);
    const user = doctorsRes.body.data?.[0];
    if (user?.id) {
      const doctorId = await resolveDoctorId(user.id);
      if (doctorId) {
        const branchesRes = await api
          .get("/api/v1/admin/branches")
          .set("Authorization", `Bearer ${adminToken}`);
        const branchId = branchesRes.body.data?.[0]?.id;
        if (branchId) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = tomorrow.toISOString().slice(0, 10);

          // Create schedule
          await api
            .post("/api/v1/schedule")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
              doctorId,
              dayOfWeek: tomorrow.getDay(),
              startTime: "09:00",
              endTime: "14:00",
              slotDurationMin: 30,
            });

          // Create appointment
          const appt = await api
            .post("/api/v1/appointments")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
              doctorId,
              patientId: patientForAppt,
              serviceId: (await api.get("/api/v1/services").set("Authorization", `Bearer ${adminToken}`)).body.data?.[0]?.id,
              branchId,
              startsAt: `${dateStr}T10:00:00`,
              endsAt: `${dateStr}T10:30:00`,
              reason: "Consulta general",
              channel: "IN_PERSON",
              priceQuoted: 500,
            });
          if (appt.status === 201) {
            appointmentForPayment = appt.body.id;
          }
        }
      }
    }
  });

  it("POST /payments with appointmentId - creates payment linked to appointment", async () => {
    if (!appointmentForPayment || !patientForAppt) return;

    const branchesRes = await api
      .get("/api/v1/admin/branches")
      .set("Authorization", `Bearer ${adminToken}`);
    const branchId = branchesRes.body.data?.[0]?.id;

    const res = await api
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        branchId,
        patientId: patientForAppt,
        appointmentId: appointmentForPayment,
        amount: 500,
        currency: "MXN",
        method: "CASH",
        notes: "Pago desde cita",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.appointmentId).toBe(appointmentForPayment);
    expect(res.body.amount).toBe(500);
    expect(res.body.status).toBe("COMPLETED");
  });

  it("GET /payments - payment shows appointmentId", async () => {
    const res = await api
      .get("/api/v1/payments")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const linked = res.body.find((p: any) => p.appointmentId === appointmentForPayment);
    expect(linked).toBeDefined();
  });
});

describe("Pharmacy Queue (F4)", () => {
  let rxForQueue: string;

  beforeAll(async () => {
    // Create prescription for queue
    const rx = await api
      .post("/api/v1/prescriptions")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        patientId: patientIdFromMe,
        medication: "Amoxicilina 500mg",
        dosage: "1 capsula",
        frequency: "Cada 8 horas",
        duration: "7 dias",
        quantity: 21,
      });
    if (rx.status === 201) rxForQueue = rx.body.id;
  });

  it("GET /pharmacy/queue - returns pending prescriptions", async () => {
    const res = await api
      .get("/api/v1/pharmacy/queue")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((r: any) => r.id === rxForQueue);
    if (rxForQueue) {
      expect(found).toBeDefined();
      expect(found.remaining).toBeDefined();
      expect(found.isFullyDispensed).toBe(false);
      expect(found.patient).toBeDefined();
      expect(found.doctor).toBeDefined();
    }
  });

  it("GET /pharmacy/queue - cajero can access", async () => {
    const res = await api
      .get("/api/v1/pharmacy/queue")
      .set("Authorization", `Bearer ${doctorToken}`); // doctor has CAJERO access
    expect(res.status).toBe(200);
  });

  it("GET /pharmacy/queue - patient forbidden", async () => {
    const res = await api
      .get("/api/v1/pharmacy/queue")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(403);
  });
});

describe("Prescription with medicationId FK (F5)", () => {
  let medForRx: string;

  beforeAll(async () => {
    const medSku = `RX-MED-${Date.now()}`;
    const med = await api
      .post("/api/v1/pharmacy/medications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        sku: medSku,
        name: "Ibuprofeno 400mg",
        presentation: "Caja 20 tabletas",
        activeIngredient: "Ibuprofeno",
        concentration: "400mg",
        requiresPrescription: true,
        price: 65.00,
      });
    if (med.status === 201) medForRx = med.body.id;
  });

  it("POST /prescriptions with medicationId - validates and links", async () => {
    const res = await api
      .post("/api/v1/prescriptions")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        patientId: patientIdFromMe,
        medication: "Ibuprofeno 400mg",
        medicationId: medForRx,
        dosage: "1 tableta",
        frequency: "Cada 8 horas",
        duration: "5 dias",
        quantity: 15,
      });
    expect(res.status).toBe(201);
    expect(res.body.medicationId).toBe(medForRx);
    expect(res.body.medicationRef).toBeDefined();
    expect(res.body.medicationRef?.name).toBe("Ibuprofeno 400mg");
  });

  it("POST /prescriptions with invalid medicationId - returns 404", async () => {
    const res = await api
      .post("/api/v1/prescriptions")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        patientId: patientIdFromMe,
        medication: "Inexistente",
        medicationId: "00000000-0000-0000-0000-000000000000",
        dosage: "1",
        frequency: "Cada 8 horas",
      });
    expect(res.status).toBe(404);
  });
});

describe("Allergy Checks at POS/Dispensing (F6)", () => {
  let allergyMedId: string;
  let allergyBatchId: string;
  let rxForAllergy: string;

  beforeAll(async () => {
    // Create medication that requires prescription
    const medSku = `ALLERGY-${Date.now()}`;
    const med = await api
      .post("/api/v1/pharmacy/medications")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        sku: medSku,
        name: "Penicilina Test",
        presentation: "Frasco 100ml",
        activeIngredient: "Penicilina",
        concentration: "500mg/5ml",
        requiresPrescription: true,
        price: 120,
      });
    allergyMedId = med.body.id;

    // Create batch
    const batch = await api
      .post("/api/v1/pharmacy/batches")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        medicationId: allergyMedId,
        batchNumber: "LOT-ALG-001",
        expiryDate: "2027-12-31",
        initialStock: 50,
        costPrice: 80,
      });
    allergyBatchId = batch.body.id;

    // Create allergy for patient
    await api
      .post(`/api/v1/pharmacy/patients/${patientIdFromMe}/allergies`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        medicationId: allergyMedId,
        severity: "HIGH",
        reaction: "Anafilaxia",
      });

    // Create prescription for dispensing test
    const rx = await api
      .post("/api/v1/prescriptions")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        patientId: patientIdFromMe,
        medication: "Penicilina Test",
        medicationId: allergyMedId,
        dosage: "10ml",
        frequency: "Cada 8 horas",
        quantity: 10,
      });
    if (rx.status === 201) rxForAllergy = rx.body.id;
  });

  it("GET /pharmacy/patients/:id/allergies/check/:medId - returns allergy", async () => {
    const res = await api
      .get(`/api/v1/pharmacy/patients/${patientIdFromMe}/allergies/check/${allergyMedId}`)
      .set("Authorization", `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].medication?.name).toBe("Penicilina Test");
  });

  it("POST /pharmacy/sales with allergic medication - returns 400", async () => {
    if (!allergyBatchId) return;

    const branchesRes = await api
      .get("/api/v1/admin/branches")
      .set("Authorization", `Bearer ${adminToken}`);
    const branchId = branchesRes.body.data?.[0]?.id;

    const res = await api
      .post("/api/v1/pharmacy/sales")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        branchId,
        patientId: patientIdFromMe,
        method: "CASH",
        items: [
          { medicationId: allergyMedId, batchId: allergyBatchId, quantity: 1, unitPrice: 120 },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("ALERTA DE ALERGIA");
  });

  it("POST /pharmacy/dispensings with allergic medication - returns 400", async () => {
    if (!rxForAllergy || !allergyBatchId) return;

    const res = await api
      .post("/api/v1/pharmacy/dispensings")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        prescriptionId: rxForAllergy,
        medicationId: allergyMedId,
        batchId: allergyBatchId,
        quantity: 5,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("ALERTA DE ALERGIA");
  });
});

describe("Unified Cash Register (F7)", () => {
  let registerId: string;

  beforeAll(async () => {
    const branchesRes = await api
      .get("/api/v1/admin/branches")
      .set("Authorization", `Bearer ${adminToken}`);
    branchId = branchesRes.body.data?.[0]?.id;
  });

  it("POST /cash-register/open - opens register", async () => {
    if (!branchId) return;
    const res = await api
      .post("/api/v1/cash-register/open")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ branchId, initialAmount: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("OPEN");
    expect(res.body.initialAmount).toBe(1000);
    registerId = res.body.id;
  });

  it("GET /cash-register/active - returns active register with branch", async () => {
    const res = await api
      .get("/api/v1/cash-register/active")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.branchId).toBe(branchId);
    expect(res.body.initialAmount).toBe(1000);
  });

  it("Creates pharmacy sale + consultation payment, then close register includes both", async () => {
    if (!branchId || !registerId || !medId || !batchId) return;

    // Create pharmacy sale
    await api
      .post("/api/v1/pharmacy/sales")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        branchId,
        patientId: patientIdFromMe,
        method: "CASH",
        items: [{ medicationId: medId, batchId, quantity: 3, unitPrice: 45.5 }],
      });

    // Create consultation payment
    await api
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        branchId,
        patientId: patientIdFromMe,
        amount: 500,
        method: "POS",
        notes: "Consulta",
      });

    // Close register
    const closeRes = await api
      .patch(`/api/v1/cash-register/${registerId}/close`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ actualAmount: 1000 + 136.5 + 500 }); // initial + sale (3*45.5) + payment

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.status).toBe("CLOSED");
    expect(closeRes.body.expectedAmount).toBe(1000 + 136.5 + 500); // sale total + payment amount
  });
});

describe("Notifications (IN_APP on prescription creation)", () => {
  let rxForNotif: string;

  it("POST /prescriptions creates notification for CAJERO/ADMIN", async () => {
    const rx = await api
      .post("/api/v1/prescriptions")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        patientId: patientIdFromMe,
        medication: "Diclofenaco 50mg",
        dosage: "1 tableta",
        frequency: "Cada 12 horas",
        quantity: 10,
      });
    expect(rx.status).toBe(201);
    rxForNotif = rx.body.id;

    // Wait a bit for notification to be created
    await new Promise((r) => setTimeout(r, 500));

    const notifRes = await api
      .get("/api/v1/notifications?type=PRESCRIPTION_CREATED")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(notifRes.status).toBe(200);
    const notif = notifRes.body.data.find((n: any) => n.referenceId === rxForNotif);
    expect(notif).toBeDefined();
    expect(notif.type).toBe("PRESCRIPTION_CREATED");
    expect(notif.title).toContain("receta");
    expect(notif.referenceType).toBe("Prescription");
  });

  it("GET /notifications/unread-count returns count", async () => {
    const res = await api
      .get("/api/v1/notifications/unread-count")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe("number");
    expect(res.body.count).toBeGreaterThanOrEqual(0);
  });

  it("PATCH /notifications/:id/read - marks as read", async () => {
    const listRes = await api
      .get("/api/v1/notifications?type=PRESCRIPTION_CREATED&limit=1")
      .set("Authorization", `Bearer ${adminToken}`);
    const notif = listRes.body.data?.[0];
    if (!notif) return;

    const res = await api
      .patch(`/api/v1/notifications/${notif.id}/read`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.readAt).toBeDefined();
  });

  it("PATCH /notifications/read-all - marks all as read", async () => {
    const res = await api
      .patch("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.updated).toBeGreaterThanOrEqual(0);
  });
});

describe("Partial Dispensing UX (POS)", () => {
  it("GET /pharmacy/queue shows remaining quantity correctly", async () => {
    const res = await api
      .get("/api/v1/pharmacy/queue")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const withQty = res.body.filter((r: any) => r.quantity !== null && r.quantity > 0);
    if (withQty.length > 0) {
      const r = withQty[0];
      expect(r.totalDispensed).toBeDefined();
      expect(r.remaining).toBeDefined();
      expect(r.isFullyDispensed).toBeDefined();
    }
  });
});

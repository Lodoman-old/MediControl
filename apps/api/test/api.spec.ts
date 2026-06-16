import request from "supertest";
import { getApp, closeApp, resolveDoctorId, resolvePatientId } from "./helpers";

let api: request.SuperTest<request.Test>;
let adminToken: string;
let doctorToken: string;
let patientToken: string;

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

  let patientIdFromMe: string;
  let branchId: string;
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

  let medId: string;
  let batchId: string;
  let saleId: string;
  let rxForDispense: string;

  let medSku: string;
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

import { Test } from "@nestjs/testing";
import { PdfService } from "./pdf.service";

describe("PdfService", () => {
  let svc: PdfService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ providers: [PdfService] }).compile();
    svc = mod.get(PdfService);
  });

  it("generateRevenueReport returns a Buffer", async () => {
    const buf = await svc.generateRevenueReport({ from: "2026-01-01", to: "2026-01-31", total: 50000, count: 10 });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });

  it("generateRevenueReport with groups", async () => {
    const buf = await svc.generateRevenueReport({
      from: "2026-01-01", to: "2026-01-31", total: 50000, count: 10,
      groups: { "Dr. Perez": { count: 5, total: 30000 }, "Dra. Lopez": { count: 5, total: 20000 } },
      groupBy: "doctor",
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("generateAppointmentsReport returns a Buffer", async () => {
    const buf = await svc.generateAppointmentsReport({ from: "2026-01-01", to: "2026-01-31", total: 50, byStatus: { COMPLETED: 30, CANCELED: 10, SCHEDULED: 10 } });
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("generatePatientsReport returns a Buffer", async () => {
    const buf = await svc.generatePatientsReport({ from: "2026-01-01", to: "2026-01-31", totalPatients: 100, activePatients: 60, totalVisits: 200, avgVisitsPerPatient: 3.3 });
    expect(Buffer.isBuffer(buf)).toBe(true);
  });

  it("generateDoctorsReport returns a Buffer", async () => {
    const buf = await svc.generateDoctorsReport([{ name: "Dr. Perez", specialty: "MEDICINA_GENERAL", appointments: 10, completed: 8, revenue: 40000 }]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});

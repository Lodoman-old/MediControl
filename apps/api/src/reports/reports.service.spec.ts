import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ReportsService } from "./reports.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ReportsService", () => {
  let svc: ReportsService;
  const mockPrisma = {
    appointment: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    patient: {
      count: jest.fn().mockResolvedValue(0),
    },
    doctor: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(ReportsService);
  });

  it("revenue returns default range", async () => {
    const result = await svc.revenue("org1");
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
    expect(result.from).toBeDefined();
    expect(result.to).toBeDefined();
  });

  it("appointments returns zero counts", async () => {
    const result = await svc.appointments("org1");
    expect(result.total).toBe(0);
  });

  it("patients returns zero counts", async () => {
    const result = await svc.patients("org1");
    expect(result.totalPatients).toBe(0);
  });

  it("doctors returns empty array", async () => {
    const result = await svc.doctors("org1");
    expect(Array.isArray(result)).toBe(true);
  });
});

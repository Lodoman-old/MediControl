import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { DashboardService } from "./dashboard.service";

describe("DashboardService", () => {
  let svc: DashboardService;
  const mockPrisma = {
    appointment: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { priceQuoted: null } }),
    },
    patient: {
      count: jest.fn().mockResolvedValue(0),
    },
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(DashboardService);
  });

  it("returns zero stats for empty org", async () => {
    const stats = await svc.getStats("org1");
    expect(stats.appointmentsToday).toBe(0);
    expect(stats.pendingPayments).toBe(0);
    expect(stats.totalPatients).toBe(0);
    expect(stats.completedToday).toBe(0);
    expect(stats.revenueToday).toBe(0);
    expect(stats.upcomingAppointments).toEqual([]);
  });

  it("calls prisma with correct organizationId", async () => {
    mockPrisma.appointment.count.mockClear();
    const spy = jest.spyOn(mockPrisma.appointment, "count");
    await svc.getStats("org-test");
    expect(spy).toHaveBeenCalled();
    const calls = spy.mock.calls as Array<Array<{ where: { organizationId: string } }>>;
    calls.forEach(([arg]) => {
      expect(arg.where.organizationId).toBe("org-test");
    });
  });

  it("returns upcoming appointments as mapped array", async () => {
    mockPrisma.appointment.findMany.mockResolvedValueOnce([
      {
        id: "1", startsAt: new Date(), endsAt: new Date(), status: "SCHEDULED",
        patient: { person: { firstName: "Juan", lastNameP: "Perez" } },
        doctor: { person: { firstName: "Dra. Maria", lastNameP: "Lopez" } },
        service: { name: "Consulta General" },
        priceQuoted: 500,
      },
    ]);
    const stats = await svc.getStats("org1");
    expect(stats.upcomingAppointments).toHaveLength(1);
    expect(stats.upcomingAppointments[0].patient).toBe("Juan Perez");
    expect(stats.upcomingAppointments[0].service).toBe("Consulta General");
    expect(stats.upcomingAppointments[0].priceQuoted).toBe(500);
  });
});

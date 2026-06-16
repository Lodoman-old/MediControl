import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async revenue(organizationId: string, from?: string, to?: string, groupBy?: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();

    const where: any = {
      organizationId,
      status: "COMPLETED",
      startsAt: { gte: fromDate, lte: toDate },
    };

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        doctor: { include: { person: true } },
        service: true,
      },
      orderBy: { startsAt: "asc" },
    });

    const total = appointments.reduce((sum, a) => sum + Number(a.priceQuoted), 0);
    const count = appointments.length;

    let groups: Record<string, { count: number; total: number }> | undefined;

    if (groupBy === "doctor") {
      groups = {};
      for (const a of appointments) {
        const key = `${a.doctor.person.firstName} ${a.doctor.person.lastNameP}`;
        if (!groups[key]) groups[key] = { count: 0, total: 0 };
        groups[key].count++;
        groups[key].total += Number(a.priceQuoted);
      }
    } else if (groupBy === "service") {
      groups = {};
      for (const a of appointments) {
        const key = a.service.name;
        if (!groups[key]) groups[key] = { count: 0, total: 0 };
        groups[key].count++;
        groups[key].total += Number(a.priceQuoted);
      }
    }

    return { from: fromDate, to: toDate, total, count, groupBy, groups };
  }

  async appointments(organizationId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();

    const where: any = {
      organizationId,
      startsAt: { gte: fromDate, lte: toDate },
    };

    const [total, byStatus] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
    ]);

    return {
      from: fromDate,
      to: toDate,
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    };
  }

  async patients(organizationId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();

    const total = await this.prisma.patient.count({ where: { organizationId } });

    const visits = await this.prisma.appointment.groupBy({
      by: ["patientId"],
      where: {
        organizationId,
        startsAt: { gte: fromDate, lte: toDate },
      },
      _count: true,
    });

    return {
      from: fromDate,
      to: toDate,
      totalPatients: total,
      activePatients: visits.length,
      totalVisits: visits.reduce((sum, v) => sum + v._count, 0),
      avgVisitsPerPatient: visits.length > 0
        ? Number((visits.reduce((sum, v) => sum + v._count, 0) / visits.length).toFixed(1))
        : 0,
    };
  }

  async doctors(organizationId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();

    const doctors = await this.prisma.doctor.findMany({
      where: { organizationId },
      include: {
        person: true,
        appointments: {
          where: {
            organizationId,
            startsAt: { gte: fromDate, lte: toDate },
          },
          include: { service: true },
        },
      },
    });

    return doctors.map((d) => ({
      id: d.id,
      name: `${d.person.firstName} ${d.person.lastNameP}`,
      specialty: d.specialtyCode,
      appointments: d.appointments.length,
      completed: d.appointments.filter((a) => a.status === "COMPLETED").length,
      revenue: d.appointments
        .filter((a) => a.status === "COMPLETED")
        .reduce((sum, a) => sum + Number(a.priceQuoted), 0),
    }));
  }
}

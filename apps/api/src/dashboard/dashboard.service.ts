import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(organizationId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      appointmentsToday,
      pendingPayments,
      totalPatients,
      completedToday,
      upcomingAppointments,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          organizationId,
          startsAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.appointment.count({
        where: {
          organizationId,
          status: "PAYMENT_PENDING_VALIDATION",
        },
      }),
      this.prisma.patient.count({
        where: { organizationId },
      }),
      this.prisma.appointment.count({
        where: {
          organizationId,
          status: "COMPLETED",
          startsAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.prisma.appointment.findMany({
        where: {
          organizationId,
          startsAt: { gte: new Date() },
          status: { notIn: ["CANCELED", "NO_SHOW", "RESCHEDULED"] },
        },
        include: {
          patient: {
            include: { person: true },
          },
          doctor: {
            include: { person: true },
          },
          service: true,
        },
        orderBy: { startsAt: "asc" },
        take: 10,
      }),
    ]);

    const revenueToday = await this.prisma.appointment.aggregate({
      where: {
        organizationId,
        status: "COMPLETED",
        startsAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { priceQuoted: true },
    });

    return {
      appointmentsToday,
      pendingPayments,
      totalPatients,
      completedToday,
      revenueToday: revenueToday._sum.priceQuoted
        ? Number(revenueToday._sum.priceQuoted)
        : 0,
      upcomingAppointments: upcomingAppointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        patient: `${a.patient.person.firstName} ${a.patient.person.lastNameP}`,
        doctor: `${a.doctor.person.firstName} ${a.doctor.person.lastNameP}`,
        service: a.service.name,
        priceQuoted: Number(a.priceQuoted),
      })),
    };
  }
}

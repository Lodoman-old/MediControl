import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { CreateAppointmentDto, ConfirmAppointmentDto, UpdateAppointmentDto, AppointmentFilterDto } from "./dto/appointment.dto";
import type { SelfScheduleDto } from "../auth/dto/self-schedule.dto";
import type { Doctor } from "@prisma/client";

async function findDoctor(prisma: PrismaService, organizationId: string, idOrUserId: string): Promise<Doctor> {
  const doctor = await prisma.doctor.findFirst({
    where: { organizationId, OR: [{ id: idOrUserId }, { userId: idOrUserId }] },
  });
  if (!doctor) throw new NotFoundException("Medico no encontrado");
  return doctor as Doctor;
}

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listAppointments(organizationId: string, filter: AppointmentFilterDto) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (filter.doctorId) {
      const doctor = await this.prisma.doctor.findFirst({
        where: { organizationId, OR: [{ id: filter.doctorId }, { userId: filter.doctorId }] },
        select: { id: true },
      });
      if (doctor) where.doctorId = doctor.id;
    }
    if (filter.patientId) where.patientId = filter.patientId;
    if (filter.status) where.status = filter.status;

    if (filter.dateFrom || filter.dateTo) {
      const startsAt: Record<string, Date> = {};
      if (filter.dateFrom) startsAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) startsAt.lte = new Date(filter.dateTo);
      where.startsAt = startsAt;
    }

    const [total, appointments] = await Promise.all([
      this.prisma.appointment.count({ where: where as any }),
      this.prisma.appointment.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { startsAt: "asc" },
        include: {
          doctor: { include: { person: true } },
          patient: { include: { person: true } },
          service: { select: { name: true, code: true } },
          serviceLocation: { select: { name: true } },
        branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: appointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        reason: a.reason,
        channel: a.channel,
        priceQuoted: a.priceQuoted,
        currency: a.currency,
        doctorName: a.doctor?.person
          ? `${a.doctor.person.firstName} ${a.doctor.person.lastNameP}`.trim()
          : null,
        patientName: a.patient?.person
          ? `${a.patient.person.firstName} ${a.patient.person.lastNameP}`.trim()
          : null,
        serviceName: a.service?.name ?? null,
        locationName: a.serviceLocation?.name ?? null,
        branchName: a.branch?.name ?? null,
        createdAt: a.createdAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAppointment(organizationId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
      include: {
        doctor: { include: { person: true } },
        patient: { include: { person: true } },
        service: true,
        serviceLocation: true,
        branch: true,
      },
    });

    if (!appointment) throw new NotFoundException("Cita no encontrada");

    return appointment;
  }

  async createAppointment(organizationId: string, dto: CreateAppointmentDto, createdByUserId?: string) {
    const doctor = await findDoctor(this.prisma, organizationId, dto.doctorId);

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, organizationId },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, organizationId },
    });
    if (!service) throw new NotFoundException("Servicio no encontrado");

    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, organizationId },
    });
    if (!branch) throw new NotFoundException("Sucursal no encontrada");

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException("La cita debe terminar despues de empezar");
    }

    const overlap = await this.prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        status: { notIn: ["CANCELED", "NO_SHOW"] },
        OR: [
          { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
        ],
      },
    });

    if (overlap) {
      throw new BadRequestException("El medico ya tiene una cita en ese horario");
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        organizationId,
        branchId: dto.branchId,
        serviceLocationId: dto.serviceLocationId ?? null,
        doctorId: doctor.id,
        patientId: dto.patientId,
        serviceId: dto.serviceId,
        startsAt,
        endsAt,
        status: "PENDING_DOCTOR_CONFIRMATION",
        reason: dto.reason ?? null,
        channel: dto.channel,
        priceQuoted: dto.priceQuoted,
        currency: dto.currency ?? "MXN",
        createdByUserId: createdByUserId ?? null,
      },
      include: {
        doctor: { include: { person: true } },
        patient: { include: { person: true } },
        service: true,
      },
    });

    this.logger.log(`Cita creada (pendiente confirmacion): ${appointment.id}`);

    await this.sendPendingConfirmationNotification(appointment);

    return appointment;
  }

  async confirmAppointment(organizationId: string, userId: string, appointmentId: string, dto: ConfirmAppointmentDto) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException("Medico no encontrado");

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId, doctorId: doctor.id },
      include: {
        doctor: { include: { person: true } },
        patient: { include: { person: true } },
        service: true,
      },
    });
    if (!appointment) throw new NotFoundException("Cita no encontrada");
    if (appointment.status !== "PENDING_DOCTOR_CONFIRMATION") {
      throw new BadRequestException("La cita no esta pendiente de confirmacion");
    }

    const loc = await this.prisma.serviceLocation.findFirst({
      where: { id: dto.serviceLocationId, organizationId },
    });
    if (!loc) throw new NotFoundException("Ubicacion no encontrada");

    const locationConflict = await this.prisma.appointment.findFirst({
      where: {
        id: { not: appointmentId },
        serviceLocationId: dto.serviceLocationId,
        status: { notIn: ["CANCELED", "NO_SHOW"] },
        OR: [
          { startsAt: { lt: appointment.endsAt }, endsAt: { gt: appointment.startsAt } },
        ],
      },
    });
    if (locationConflict) {
      throw new BadRequestException("La ubicacion ya esta ocupada en ese horario");
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "SCHEDULED",
        serviceLocationId: dto.serviceLocationId,
      },
      include: {
        doctor: { include: { person: true } },
        patient: { include: { person: true } },
        service: true,
      },
    });

    this.logger.log(`Cita confirmada por medico: ${appointmentId}`);
    await this.sendConfirmationNotification(updated);
    await this.createAppointmentReminders(updated);

    return updated;
  }

  async updateAppointment(organizationId: string, appointmentId: string, dto: UpdateAppointmentDto) {
    const existing = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
    });
    if (!existing) throw new NotFoundException("Cita no encontrada");

    const data: Record<string, unknown> = {};

    if (dto.status) data.status = dto.status;
    if (dto.reason !== undefined) data.reason = dto.reason;
    if (dto.startsAt) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt) data.endsAt = new Date(dto.endsAt);
    if (dto.serviceLocationId) data.serviceLocationId = dto.serviceLocationId;
    if (dto.serviceId) data.serviceId = dto.serviceId;

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: data as any,
      include: {
        doctor: { include: { person: true } },
        patient: { include: { person: true } },
        service: true,
      },
    });

    return updated;
  }

  async getDaySummary(organizationId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);

    const where = {
      organizationId,
      startsAt: { gte: dayStart, lte: dayEnd },
    } as any;

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        doctor: { include: { person: true } },
        patient: { include: { person: true } },
        service: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === "COMPLETED").length;
    const cancelled = appointments.filter((a) => a.status === "CANCELED").length;
    const noShow = appointments.filter((a) => a.status === "NO_SHOW").length;
    const pending = appointments.filter((a) =>
      ["SCHEDULED", "PAYMENT_PENDING_VALIDATION", "PAID", "CHECKED_IN", "IN_TRIAGE"].includes(a.status),
    ).length;

    return {
      date,
      total,
      completed,
      cancelled,
      noShow,
      pending,
      appointments: appointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        doctorName: a.doctor?.person
          ? `${a.doctor.person.firstName} ${a.doctor.person.lastNameP}`.trim()
          : null,
        patientName: a.patient?.person
          ? `${a.patient.person.firstName} ${a.patient.person.lastNameP}`.trim()
          : null,
        serviceName: a.service?.name ?? null,
        reason: a.reason,
      })),
    };
  }

  private async createAppointmentReminders(appointment: any) {
    const reminders = [
      { type: "EMAIL", hoursBefore: 24 },
      { type: "EMAIL", hoursBefore: 1 },
    ];
    if (appointment.patient?.phoneE164) {
      reminders.push({ type: "WHATSAPP", hoursBefore: 1 });
    }
    const startsAt = new Date(appointment.startsAt);
    for (const r of reminders) {
      const scheduledFor = new Date(startsAt.getTime() - r.hoursBefore * 60 * 60 * 1000);
      if (scheduledFor > new Date()) {
        await this.prisma.appointmentReminder.create({
          data: {
            appointmentId: appointment.id,
            reminderType: r.type,
            scheduledFor,
            status: "PENDING",
          },
        });
      }
    }
  }

  async getPatientAppointments(organizationId: string, userId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    return this.prisma.appointment.findMany({
      where: { patientId: patient.id, organizationId },
      include: {
        doctor: { include: { person: { select: { firstName: true, lastNameP: true } } } },
        service: { select: { name: true } },
        serviceLocation: { select: { name: true } },
      },
      orderBy: { startsAt: "desc" },
    });
  }

  async selfSchedule(organizationId: string, userId: string, dto: SelfScheduleDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const doctor = await findDoctor(this.prisma, organizationId, dto.doctorId);

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, organizationId },
    });
    if (!service) throw new NotFoundException("Servicio no encontrado");

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException("La cita debe terminar despues de empezar");
    }

    const overlap = await this.prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        status: { notIn: ["CANCELED", "NO_SHOW"] },
        OR: [{ startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }],
      },
    });

    if (overlap) {
      throw new BadRequestException("El medico ya tiene una cita en ese horario");
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        organizationId,
        branchId: dto.branchId,
        serviceLocationId: dto.serviceLocationId ?? null,
        doctorId: doctor.id,
        patientId: patient.id,
        serviceId: dto.serviceId,
        startsAt,
        endsAt,
        status: "PENDING_DOCTOR_CONFIRMATION",
        reason: dto.reason ?? null,
        channel: "PATIENT_PORTAL",
        priceQuoted: Number(service.defaultPrice),
        currency: service.currency,
        createdByUserId: userId,
      },
      include: {
        doctor: { include: { person: true } },
        patient: { include: { person: true } },
        service: true,
      },
    });

    this.logger.log(`Auto-cita creada (pendiente confirmacion): ${appointment.id}`);
    await this.sendPendingConfirmationNotification(appointment);
    return appointment;
  }

  async getPendingDoctorAppointments(organizationId: string, userId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException("Medico no encontrado");

    const now = new Date();
    return this.prisma.appointment.findMany({
      where: {
        organizationId,
        doctorId: doctor.id,
        status: "PENDING_DOCTOR_CONFIRMATION",
        startsAt: { gte: now },
      },
      include: {
        patient: { include: { person: { select: { firstName: true, lastNameP: true, lastNameM: true } } } },
        service: { select: { name: true, durationMin: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "asc" },
    });
  }

  async getDoctorAppointments(organizationId: string, userId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException("Medico no encontrado");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        organizationId,
        doctorId: doctor.id,
        startsAt: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { include: { person: { select: { firstName: true, lastNameP: true, lastNameM: true } } } },
        service: { select: { name: true } },
        serviceLocation: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === "COMPLETED").length;
    const cancelled = appointments.filter((a) => a.status === "CANCELED" || a.status === "NO_SHOW").length;
    const pending = appointments.filter((a) =>
      ["SCHEDULED", "PAYMENT_PENDING_VALIDATION", "PAID", "CHECKED_IN"].includes(a.status),
    ).length;

    return {
      date: today.toISOString().slice(0, 10),
      total,
      completed,
      cancelled,
      pending,
      appointments: appointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        patientName: a.patient?.person
          ? `${a.patient.person.firstName} ${a.patient.person.lastNameP}${a.patient.person.lastNameM ? " " + a.patient.person.lastNameM : ""}`
          : null,
        patientId: a.patientId,
        serviceName: a.service?.name ?? null,
        locationName: a.serviceLocation?.name ?? null,
        reason: a.reason,
      })),
    };
  }

  async startConsult(organizationId: string, userId: string, appointmentId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException("Medico no encontrado");

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId, doctorId: doctor.id },
    });
    if (!appointment) throw new NotFoundException("Cita no encontrada");

    if (!["SCHEDULED", "PAYMENT_PENDING_VALIDATION", "PAID", "CHECKED_IN", "IN_TRIAGE"].includes(appointment.status)) {
      throw new BadRequestException("La cita no puede iniciar consulta en este estado");
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "IN_CONSULT" },
    });
  }

  async completeConsult(organizationId: string, userId: string, appointmentId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException("Medico no encontrado");

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId, doctorId: doctor.id },
    });
    if (!appointment) throw new NotFoundException("Cita no encontrada");

    if (appointment.status !== "IN_CONSULT") {
      throw new BadRequestException("La cita debe estar en consulta para finalizarse");
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "COMPLETED" },
    });
  }

  async markNoShow(organizationId: string, userId: string, appointmentId: string) {
    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException("Medico no encontrado");

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId, doctorId: doctor.id },
    });
    if (!appointment) throw new NotFoundException("Cita no encontrada");

    if (!["SCHEDULED", "PAYMENT_PENDING_VALIDATION", "PAID", "CHECKED_IN", "IN_TRIAGE"].includes(appointment.status)) {
      throw new BadRequestException("No se puede marcar como inasistencia en este estado");
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "NO_SHOW" },
    });
  }

  async triageAppointment(
    organizationId: string,
    userId: string,
    appointmentId: string,
    vitals: {
      bloodPressureSystolic?: number;
      bloodPressureDiastolic?: number;
      heartRate?: number;
      respiratoryRate?: number;
      temperature?: number;
      oxygenSaturation?: number;
      weight?: number;
      height?: number;
      glucose?: number;
      notes?: string;
    },
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
      select: { id: true, status: true, organizationId: true },
    });
    if (!appointment) throw new NotFoundException("Cita no encontrada");
    if (appointment.status !== "CHECKED_IN") {
      throw new BadRequestException("La cita debe estar registrada (CHECKED_IN) para realizar triage");
    }

    const [updated] = await Promise.all([
      this.prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "IN_TRIAGE" },
      }),
      this.prisma.vitalSign.create({
        data: {
          organizationId,
          appointmentId,
          bloodPressureSystolic: vitals.bloodPressureSystolic,
          bloodPressureDiastolic: vitals.bloodPressureDiastolic,
          heartRate: vitals.heartRate,
          respiratoryRate: vitals.respiratoryRate,
          temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
          oxygenSaturation: vitals.oxygenSaturation,
          weight: vitals.weight ? Number(vitals.weight) : undefined,
          height: vitals.height ? Number(vitals.height) : undefined,
          glucose: vitals.glucose,
          notes: vitals.notes,
        },
      }),
    ]);

    return updated;
  }

  async cancelPatientAppointment(organizationId: string, userId: string, appointmentId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId, patientId: patient.id },
    });
    if (!appointment) throw new NotFoundException("Cita no encontrada");

    if (!["PENDING_DOCTOR_CONFIRMATION", "SCHEDULED", "PAYMENT_PENDING_VALIDATION"].includes(appointment.status)) {
      throw new BadRequestException("No se puede cancelar una cita en este estado");
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELED" },
    });

    this.logger.log(`Cita cancelada por paciente: ${appointmentId}`);
    return updated;
  }

  private async sendPendingConfirmationNotification(appointment: any) {
    try {
      const patientName = appointment.patient?.person
        ? `${appointment.patient.person.firstName} ${appointment.patient.person.lastNameP}`
        : "Paciente";
      const serviceName = appointment.service?.name ?? "consulta";
      const dateStr = new Date(appointment.startsAt).toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long",
      });
      const timeStr = new Date(appointment.startsAt).toLocaleTimeString("es-MX", {
        hour: "2-digit", minute: "2-digit",
      });

      if (appointment.doctor?.userId) {
        await this.notifications.create(appointment.organizationId, {
          userId: appointment.doctor.userId,
          channel: "IN_APP",
          type: "APPOINTMENT_PENDING_CONFIRMATION",
          title: "Nueva cita pendiente",
          message: `Tienes una cita de ${serviceName} con ${patientName} el ${dateStr} a las ${timeStr}. Confirma y asigna la ubicacion.`,
          referenceType: "appointment",
          referenceId: appointment.id,
        });
      }
    } catch (err) {
      this.logger.error("Error enviando notificacion de cita pendiente", err);
    }
  }

  private async sendConfirmationNotification(appointment: any) {
    try {
      const doctorName = appointment.doctor?.person
        ? `${appointment.doctor.person.firstName} ${appointment.doctor.person.lastNameP}`
        : "Medico";
      const dateStr = new Date(appointment.startsAt).toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long",
      });
      const timeStr = new Date(appointment.startsAt).toLocaleTimeString("es-MX", {
        hour: "2-digit", minute: "2-digit",
      });

      await this.notifications.create(appointment.organizationId, {
        userId: appointment.patient?.userId || appointment.createdByUserId,
        channel: "IN_APP",
        type: "APPOINTMENT_CONFIRMED",
        title: "Cita Confirmada",
        message: `Tu cita con ${doctorName} ha sido confirmada para el ${dateStr} a las ${timeStr}.`,
        referenceType: "appointment",
        referenceId: appointment.id,
      });
    } catch (err) {
      this.logger.error("Error enviando notificacion de confirmacion", err);
    }
  }
}

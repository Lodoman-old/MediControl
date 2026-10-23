import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hash as argonHash } from "@node-rs/argon2";
import { randomBytes } from "crypto";
import { wallTimeToUtc, timeOfDayMinutes, dateOnly, weekdayOf, shiftDate, formatMinutes } from "../common/timezone";
import type { PublicBookAppointmentDto } from "./dto/public-appointment.dto";

@Injectable()
export class PublicAppointmentService {
  private readonly logger = new Logger(PublicAppointmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listPublicClinics() {
    const clinics = await this.prisma.organization.findMany({
      where: { branches: { some: { isActive: true } } },
      select: { id: true, legalName: true, slug: true },
      orderBy: { legalName: "asc" },
    });

    return clinics.map((c) => ({ id: c.id, name: c.legalName, slug: c.slug }));
  }

  async getOrgIdBySlug(slug?: string): Promise<string | null> {
    if (!slug) return null;
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    return org?.id ?? null;
  }

  async bookPublicAppointment(organizationId: string, dto: PublicBookAppointmentDto): Promise<any> {
    this.assertUuid(organizationId, "organizationId");
    this.assertUuid(dto.doctorId, "doctorId");
    this.assertUuid(dto.serviceId, "serviceId");
    this.assertUuid(dto.branchId, "branchId");
    if (dto.patientId) this.assertUuid(dto.patientId, "patientId");

    // Validate doctor
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: dto.doctorId, organizationId },
    });
    if (!doctor) throw new NotFoundException("Medico no encontrado");

    // Validate service
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, organizationId, isActive: true },
    });
    if (!service) throw new NotFoundException("Servicio no encontrado");

    // Validate branch
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, organizationId },
    });
    if (!branch) throw new NotFoundException("Sucursal no encontrada");

    // Check availability using the clinic timezone
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    });
    if (!org) throw new NotFoundException("Clinica no encontrada");
    const timeZone = org.timezone || "America/Mexico_City";

    const dayOfWeek = weekdayOf(dto.date);
    const targetDate = dateOnly(dto.date);

    const exception = await this.prisma.scheduleException.findFirst({
      where: { doctorId: dto.doctorId, exceptionDate: targetDate, organizationId },
    });
    if (exception && !exception.isAvailable) {
      throw new ConflictException("El medico no tiene disponibilidad en esa fecha");
    }

    const schedules = await this.prisma.schedule.findMany({
      where: { doctorId: dto.doctorId, dayOfWeek, isActive: true, organizationId },
    });

    if (schedules.length === 0) throw new ConflictException("El medico no tiene horario ese dia");

    // Find the schedule that contains the requested wall-clock time
    const [h, min] = dto.startTime.split(":").map(Number);
    const requestedMinutes = h! * 60 + min!;

    const matchingSchedule = schedules.find((s) => {
      const schedStart = timeOfDayMinutes(s.startTime);
      const schedEnd = timeOfDayMinutes(s.endTime);
      return requestedMinutes >= schedStart && requestedMinutes < schedEnd;
    });

    if (!matchingSchedule) {
      throw new ConflictException("La hora solicitada no esta dentro del horario del medico");
    }

    // Check slot availability
    const slotDuration = dto.durationMin ?? service.durationMin ?? 30;
    const requestedStart = wallTimeToUtc(dto.date, dto.startTime, timeZone);
    const requestedEnd = new Date(requestedStart.getTime() + slotDuration * 60 * 1000);

    const dateStart = wallTimeToUtc(dto.date, "00:00", timeZone);
    const dateEnd = wallTimeToUtc(shiftDate(dto.date, 1), "00:00", timeZone);

    const existingAppts = await this.prisma.appointment.findMany({
      where: {
        doctorId: dto.doctorId,
        startsAt: { gte: dateStart, lt: dateEnd },
        status: { notIn: ["CANCELED", "NO_SHOW"] },
      },
      select: { startsAt: true, endsAt: true },
    });

    for (const a of existingAppts) {
      if (requestedStart < a.endsAt && requestedEnd > a.startsAt) {
        throw new ConflictException("El horario solicitado ya esta ocupado");
      }
    }

    // Resolve or create patient and appointment atomically. If anything fails,
    // no orphan person/user/patient rows are left behind.
    const appointment = await this.prisma.$transaction(async (tx) => {
      let patientId: string;

      if (dto.patientId) {
        const existing = await tx.patient.findFirst({
          where: { id: dto.patientId, organizationId },
        });
        if (!existing) throw new NotFoundException("Paciente no encontrado");
        patientId = existing.id;
      } else {
        const tempEmail = `public+${randomBytes(8).toString("hex")}@medicontrol.local`;
        const tempPassword = randomBytes(12).toString("base64url");
        const passwordHash = await argonHash(tempPassword);
        const mrn = await this.generateMrn(organizationId);

        const person = await tx.person.create({
          data: {
            organizationId,
            firstName: dto.firstName,
            lastNameP: dto.lastNameP,
            lastNameM: dto.lastNameM ?? null,
            birthDate: new Date(dto.birthDate),
            gender: dto.gender as any,
            curp: dto.curp ?? null,
          },
        });

        const user = await tx.user.create({
          data: {
            organizationId,
            personId: person.id,
            email: tempEmail,
            phoneE164: dto.phone,
            passwordHash,
            status: "ACTIVE",
            mustChangePassword: true,
          },
        });

        const patient = await tx.patient.create({
          data: {
            organizationId,
            userId: user.id,
            personId: person.id,
            mrn,
            preferredLanguage: "es-MX",
            consentPrivacyAt: new Date(),
          },
        });

        const patientRole = await tx.role.findFirst({
          where: { organizationId, code: "PATIENT" },
        });
        if (patientRole) {
          await tx.userRole.create({
            data: { organizationId, userId: user.id, roleId: patientRole.id },
          });
        }

        patientId = patient.id;
      }

      return tx.appointment.create({
        data: {
          organizationId,
          doctorId: dto.doctorId,
          patientId,
          serviceId: dto.serviceId,
          branchId: dto.branchId,
          startsAt: requestedStart,
          endsAt: requestedEnd,
          reason: dto.reason ?? null,
          channel: "ONLINE",
          priceQuoted: service.defaultPrice,
          currency: service.currency,
          status: "SCHEDULED",
        },
        include: {
          doctor: { include: { person: true } },
          service: true,
          branch: true,
          patient: { include: { person: true } },
        },
      });
    });

    this.logger.log(`Cita pública creada: ${appointment.id} (paciente: ${appointment.patientId}, medico: ${dto.doctorId})`);

    return {
      appointmentId: appointment.id,
      status: appointment.status,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      doctor: `${appointment.doctor.person.firstName} ${appointment.doctor.person.lastNameP}`,
      service: appointment.service.name,
      branch: appointment.branch.name,
      priceQuoted: appointment.priceQuoted,
      currency: appointment.currency,
    };
  }

  async checkAvailability(
    organizationId: string,
    doctorId: string,
    date: string,
    serviceId: string,
  ): Promise<{ available: boolean; slots: Array<{ start: string; end: string }> }> {
    this.assertUuid(organizationId, "organizationId");
    this.assertUuid(doctorId, "doctorId");
    this.assertUuid(serviceId, "serviceId");

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    });
    if (!org) throw new NotFoundException("Clinica no encontrada");
    const timeZone = org.timezone || "America/Mexico_City";

    const targetDate = dateOnly(date);

    const exception = await this.prisma.scheduleException.findFirst({
      where: { doctorId, exceptionDate: targetDate, organizationId },
    });
    if (exception && !exception.isAvailable) return { available: false, slots: [] };

    const schedules = await this.prisma.schedule.findMany({
      where: { doctorId, dayOfWeek: weekdayOf(date), isActive: true, organizationId },
    });
    if (schedules.length === 0) return { available: false, slots: [] };

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, organizationId, isActive: true },
    });
    const slotDuration = service?.durationMin ?? 30;

    const dateStart = wallTimeToUtc(date, "00:00", timeZone);
    const dateEnd = wallTimeToUtc(shiftDate(date, 1), "00:00", timeZone);

    const existingAppts = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        startsAt: { gte: dateStart, lt: dateEnd },
        status: { notIn: ["CANCELED", "NO_SHOW"] },
      },
      select: { startsAt: true, endsAt: true },
    });

    const slots: Array<{ start: string; end: string }> = [];
    const isOccupied = (start: Date, end: Date) =>
      existingAppts.some((a) => start < a.endsAt && end > a.startsAt);

    for (const sched of schedules) {
      const startMin = timeOfDayMinutes(sched.startTime);
      const endMin = Math.min(timeOfDayMinutes(sched.endTime), 24 * 60 - 1);

      for (let cursor = startMin; cursor + slotDuration <= endMin; cursor += slotDuration) {
        const startTime = formatMinutes(cursor);
        const endTime = formatMinutes(cursor + slotDuration);
        const slotStart = wallTimeToUtc(date, startTime, timeZone);
        const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);
        if (!isOccupied(slotStart, slotEnd)) {
          slots.push({ start: startTime, end: endTime });
        }
      }
    }

    return { available: slots.length > 0, slots };
  }

  private assertUuid(value: string | undefined, field: string): void {
    if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException(`${field} invalido`);
    }
  }

  private async generateMrn(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.prisma.patient.count({ where: { organizationId } });
    const seq = String(count + 1).padStart(5, "0");
    return `MRN${year}${seq}`;
  }
}
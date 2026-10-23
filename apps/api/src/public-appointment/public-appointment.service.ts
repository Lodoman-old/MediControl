import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hash as argonHash } from "@node-rs/argon2";
import { randomBytes } from "crypto";
import type { PublicBookAppointmentDto } from "./dto/public-appointment.dto";

@Injectable()
export class PublicAppointmentService {
  private readonly logger = new Logger(PublicAppointmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrgIdBySlug(slug?: string): Promise<string | null> {
    if (!slug) return null;
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    return org?.id ?? null;
  }

  async bookPublicAppointment(organizationId: string, dto: PublicBookAppointmentDto): Promise<any> {
    // Find or create patient
    let patientId: string;

    if (dto.patientId) {
      const existing = await this.prisma.patient.findFirst({
        where: { id: dto.patientId, organizationId },
      });
      if (!existing) throw new NotFoundException("Paciente no encontrado");
      patientId = existing.id;
    } else {
      // Create new patient
      const tempEmail = `public+${randomBytes(8).toString("hex")}@medicontrol.local`;
      const tempPassword = randomBytes(12).toString("base64url");
      const passwordHash = await argonHash(tempPassword);

      const mrn = await this.generateMrn(organizationId);

      const person = await this.prisma.person.create({
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

      const user = await this.prisma.user.create({
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

      const patient = await this.prisma.patient.create({
        data: {
          organizationId,
          userId: user.id,
          personId: person.id,
          mrn,
          preferredLanguage: "es-MX",
          consentPrivacyAt: new Date(),
        },
      });

      const patientRole = await this.prisma.role.findFirst({
        where: { organizationId, code: "PATIENT" },
      });
      if (patientRole) {
        await this.prisma.userRole.create({
          data: { organizationId, userId: user.id, roleId: patientRole.id },
        });
      }

      patientId = patient.id;
      this.logger.log(`Paciente público creado: ${patientId} (${dto.firstName} ${dto.lastNameP})`);
    }

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

    // Check availability
    const [y, m, d] = dto.date.split("-").map(Number);
    const targetDate = new Date(y, m - 1, d);
    const dayOfWeek = targetDate.getDay();

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

    // Find the schedule that contains the requested time
    const [h, min] = dto.startTime.split(":").map(Number);
    const requestedStart = new Date(targetDate);
    requestedStart.setHours(h, min, 0, 0);

    const matchingSchedule = schedules.find((s) => {
      const schedStart = new Date(targetDate);
      schedStart.setHours(s.startTime.getHours(), s.startTime.getMinutes(), 0, 0);
      const schedEnd = new Date(targetDate);
      schedEnd.setHours(s.endTime.getHours(), s.endTime.getMinutes(), 0, 0);
      return requestedStart >= schedStart && requestedStart < schedEnd;
    });

    if (!matchingSchedule) {
      throw new ConflictException("La hora solicitada no esta dentro del horario del medico");
    }

    // Check slot availability
    const slotDuration = dto.durationMin ?? service.durationMin ?? 30;
    const requestedEnd = new Date(requestedStart.getTime() + slotDuration * 60 * 1000);

    // Check if slot is free
    const dateStart = new Date(targetDate);
    const dateEnd = new Date(targetDate);
    dateEnd.setDate(dateEnd.getDate() + 1);

    const existingAppts = await this.prisma.appointment.findMany({
      where: {
        doctorId: dto.doctorId,
        startsAt: { gte: dateStart, lt: dateEnd },
        status: { notIn: ["CANCELED", "NO_SHOW"] },
      },
      select: { startsAt: true, endsAt: true },
    });

    const occupied = existingAppts.map((a) => [a.startsAt, a.endsAt]);

    for (const [oStart, oEnd] of occupied) {
      if (requestedStart < oEnd && requestedEnd > oStart) {
        throw new ConflictException("El horario solicitado ya esta ocupado");
      }
    }

    // Create appointment
    const appointment = await this.prisma.appointment.create({
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

    this.logger.log(`Cita pública creada: ${appointment.id} (paciente: ${patientId}, medico: ${dto.doctorId})`);

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
    const [y, m, d] = date.split("-").map(Number);
    const targetDate = new Date(y, m - 1, d);
    const dayOfWeek = targetDate.getDay();

    const exception = await this.prisma.scheduleException.findFirst({
      where: { doctorId, exceptionDate: targetDate, organizationId },
    });
    if (exception && !exception.isAvailable) return { available: false, slots: [] };

    const schedules = await this.prisma.schedule.findMany({
      where: { doctorId, dayOfWeek, isActive: true, organizationId },
    });
    if (schedules.length === 0) return { available: false, slots: [] };

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, organizationId, isActive: true },
    });
    const slotDuration = service?.durationMin ?? 30;

    const dateStart = new Date(targetDate);
    const dateEnd = new Date(targetDate);
    dateEnd.setDate(dateEnd.getDate() + 1);

    const existingAppts = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        startsAt: { gte: dateStart, lt: dateEnd },
        status: { notIn: ["CANCELED", "NO_SHOW"] },
      },
      select: { startsAt: true, endsAt: true },
    });

    const occupied = existingAppts.map((a) => [a.startsAt, a.endsAt]);
    const slots: Array<{ start: string; end: string }> = [];
    const fmt = (dt: Date) =>
      `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;

    for (const sched of schedules) {
      const startH = sched.startTime.getHours();
      const startM = sched.startTime.getMinutes();
      const endH = sched.endTime.getHours();
      const endM = sched.endTime.getMinutes();

      const blockStart = new Date(y, m - 1, d, startH, startM);
      const blockEnd = new Date(y, m - 1, d, endH, endM);

      const sorted = [...occupied].sort((a, b) => a[0].getTime() - b[0].getTime());
      let cursor = new Date(blockStart);

      for (const [oStart, oEnd] of sorted) {
        if (cursor >= blockEnd) break;
        if (oStart > cursor) {
          const gapStart = new Date(cursor);
          const gapEnd = new Date(Math.min(oStart.getTime(), blockEnd.getTime()));
          // Generate slots of slotDuration minutes
          let slotStart = new Date(gapStart);
          while (slotStart < gapEnd) {
            const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);
            if (slotEnd <= gapEnd) {
              slots.push({ start: fmt(slotStart), end: fmt(slotEnd) });
            }
            slotStart = new Date(slotStart.getTime() + slotDuration * 60 * 1000);
          }
        }
        cursor = new Date(Math.max(cursor.getTime(), oEnd.getTime()));
      }

      if (cursor < blockEnd) {
        let slotStart = new Date(cursor);
        while (slotStart < blockEnd) {
          const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);
          if (slotEnd <= blockEnd) {
            slots.push({ start: fmt(slotStart), end: fmt(slotEnd) });
          }
          slotStart = new Date(slotStart.getTime() + slotDuration * 60 * 1000);
        }
      }
    }

    return { available: slots.length > 0, slots };
  }

  private async generateMrn(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.prisma.patient.count({ where: { organizationId } });
    const seq = String(count + 1).padStart(5, "0");
    return `MRN${year}${seq}`;
  }
}
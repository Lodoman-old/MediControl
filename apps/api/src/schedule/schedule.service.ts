import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateScheduleDto,
  UpdateScheduleDto,
  ScheduleResponseDto,
  CreateScheduleExceptionDto,
  UpdateScheduleExceptionDto,
  AvailableSlotDto,
} from "./dto/schedule.dto";
import type { Doctor } from "@prisma/client";

async function findDoctor(prisma: PrismaService, organizationId: string, idOrUserId: string): Promise<Doctor> {
  const doctor = await prisma.doctor.findFirst({
    where: { organizationId, OR: [{ id: idOrUserId }, { userId: idOrUserId }] },
  });
  if (!doctor) throw new NotFoundException("Medico no encontrado");
  return doctor as Doctor;
}

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listSchedules(organizationId: string, doctorId?: string): Promise<ScheduleResponseDto[]> {
    const where: Record<string, unknown> = { organizationId };
    if (doctorId) {
      const doctor = await this.prisma.doctor.findFirst({
        where: { organizationId, OR: [{ id: doctorId }, { userId: doctorId }] },
        select: { id: true },
      });
      if (doctor) where.doctorId = doctor.id;
    }

    const schedules = await this.prisma.schedule.findMany({
      where: where as any,
      orderBy: [{ doctorId: "asc" }, { dayOfWeek: "asc" }],
    });

    return schedules.map((s) => ({
      id: s.id,
      doctorId: s.doctorId,
      serviceLocationId: s.serviceLocationId,
      dayOfWeek: s.dayOfWeek,
      startTime: `${String(s.startTime.getHours()).padStart(2, "0")}:${String(s.startTime.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(s.endTime.getHours()).padStart(2, "0")}:${String(s.endTime.getMinutes()).padStart(2, "0")}`,
      slotDurationMin: s.slotDurationMin,
      isActive: s.isActive,
      maxPatients: s.maxPatients,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async createSchedule(organizationId: string, dto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    const doctor = await findDoctor(this.prisma, organizationId, dto.doctorId);

    const toTime = (t: string): Date => {
      const [h, m] = t.split(":").map(Number);
      const d = new Date(1970, 0, 1, h, m);
      if (isNaN(d.getTime())) throw new BadRequestException(`Formato de hora invalido: ${t}`);
      return d;
    };

    const newStart = toTime(dto.startTime);
    const newEnd = toTime(dto.endTime);

    if (newStart >= newEnd) {
      throw new BadRequestException("La hora de inicio debe ser anterior a la hora de fin");
    }

    const overlapping = await this.prisma.schedule.findFirst({
      where: {
        doctorId: doctor.id,
        dayOfWeek: dto.dayOfWeek,
        organizationId,
        // blocks that overlap: start < newEnd AND end > newStart
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });
    if (overlapping) {
      throw new BadRequestException("El horario se superpone con un bloque existente");
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        organizationId,
        doctorId: doctor.id,
        dayOfWeek: dto.dayOfWeek,
        startTime: newStart,
        endTime: newEnd,
        slotDurationMin: dto.slotDurationMin ?? 30,
        isActive: dto.isActive ?? true,
        maxPatients: dto.maxPatients ?? null,
      },
    });

    this.logger.log(`Horario creado: ${schedule.id} (doctor ${doctor.id}, dia ${dto.dayOfWeek})`);

    return this.mapSchedule(schedule);
  }

  async updateSchedule(
    organizationId: string,
    scheduleId: string,
    dto: UpdateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, organizationId },
    });
    if (!schedule) throw new NotFoundException("Horario no encontrado");

    const newStart = dto.startTime !== undefined
      ? (([h, m]) => new Date(1970, 0, 1, +h, +m))(dto.startTime.split(":"))
      : schedule.startTime;
    const newEnd = dto.endTime !== undefined
      ? (([h, m]) => new Date(1970, 0, 1, +h, +m))(dto.endTime.split(":"))
      : schedule.endTime;
    const newDay = dto.dayOfWeek ?? schedule.dayOfWeek;

    if (newStart >= newEnd) {
      throw new BadRequestException("La hora de inicio debe ser anterior a la hora de fin");
    }

    const overlapping = await this.prisma.schedule.findFirst({
      where: {
        id: { not: scheduleId },
        doctorId: schedule.doctorId,
        dayOfWeek: newDay,
        organizationId,
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });
    if (overlapping) {
      throw new BadRequestException("El horario se superpone con un bloque existente");
    }

    const updated = await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        ...(dto.dayOfWeek !== undefined && { dayOfWeek: dto.dayOfWeek }),
        ...(dto.startTime !== undefined && { startTime: newStart }),
        ...(dto.endTime !== undefined && { endTime: newEnd }),
        ...(dto.slotDurationMin !== undefined && { slotDurationMin: dto.slotDurationMin }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.maxPatients !== undefined && { maxPatients: dto.maxPatients }),
      },
    });

    return this.mapSchedule(updated);
  }

  async deleteSchedule(organizationId: string, scheduleId: string): Promise<void> {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, organizationId },
    });
    if (!schedule) throw new NotFoundException("Horario no encontrado");

    await this.prisma.schedule.delete({ where: { id: scheduleId } });
    this.logger.log(`Horario eliminado: ${scheduleId}`);
  }

  async listExceptions(organizationId: string, doctorId?: string): Promise<any[]> {
    const where: Record<string, unknown> = { organizationId };
    if (doctorId) {
      const doctor = await this.prisma.doctor.findFirst({
        where: { organizationId, OR: [{ id: doctorId }, { userId: doctorId }] },
        select: { id: true },
      });
      if (doctor) where.doctorId = doctor.id;
    }

    return this.prisma.scheduleException.findMany({
      where: where as any,
      orderBy: { exceptionDate: "desc" },
    });
  }

  async createException(organizationId: string, dto: CreateScheduleExceptionDto): Promise<any> {
    const doctor = await findDoctor(this.prisma, organizationId, dto.doctorId);

    const exc = await this.prisma.scheduleException.create({
      data: {
        organizationId,
        doctorId: doctor.id,
        exceptionDate: new Date(dto.exceptionDate),
        startTime: dto.startTime
          ? (([h, m]) => new Date(1970, 0, 1, +h, +m))(dto.startTime.split(":"))
          : null,
        endTime: dto.endTime
          ? (([h, m]) => new Date(1970, 0, 1, +h, +m))(dto.endTime.split(":"))
          : null,
        isAvailable: dto.isAvailable ?? false,
        reason: dto.reason ?? null,
      },
    });

    return exc;
  }

  async deleteException(organizationId: string, exceptionId: string): Promise<void> {
    const exc = await this.prisma.scheduleException.findFirst({
      where: { id: exceptionId, organizationId },
    });
    if (!exc) throw new NotFoundException("Excepcion no encontrada");

    await this.prisma.scheduleException.delete({ where: { id: exceptionId } });
  }

  async getAvailableSlots(
    organizationId: string,
    query: { date: string; doctorId: string; durationMin?: number; serviceLocationId?: string },
  ): Promise<AvailableSlotDto[]> {
    const { date, doctorId, durationMin, serviceLocationId } = query;
    const [y, m, d] = date.split("-").map(Number);
    const targetDate = new Date(y, m - 1, d);
    const dayOfWeek = targetDate.getDay();

    const doctor = await findDoctor(this.prisma, organizationId, doctorId);
    const docId = doctor.id;

    const exception = await this.prisma.scheduleException.findFirst({
      where: {
        doctorId: docId,
        exceptionDate: targetDate,
        organizationId,
      },
    });

    if (exception && !exception.isAvailable) return [];

    const scheduleWhere: Record<string, unknown> = { doctorId: docId, dayOfWeek, isActive: true, organizationId };

    const schedules = await this.prisma.schedule.findMany({
      where: scheduleWhere as any,
    });

    if (schedules.length === 0) return [];

    const dateStart = new Date(y, m - 1, d);
    const dateEnd = new Date(y, m - 1, d + 1);

    const existingAppts = await this.prisma.appointment.findMany({
      where: {
        doctorId: docId,
        startsAt: { gte: dateStart, lt: dateEnd },
        status: { notIn: ["CANCELED", "NO_SHOW"] },
      },
      select: { startsAt: true, endsAt: true },
    });

    const occupied: Array<[Date, Date]> = existingAppts.map((a) => [a.startsAt, a.endsAt]);

    // Block slots where the location is occupied by another doctor
    if (serviceLocationId) {
      const locationAppts = await this.prisma.appointment.findMany({
        where: {
          serviceLocationId,
          doctorId: { not: docId },
          startsAt: { gte: dateStart, lt: dateEnd },
          status: { notIn: ["CANCELED", "NO_SHOW"] },
        },
        select: { startsAt: true, endsAt: true },
      });
      for (const a of locationAppts) {
        occupied.push([a.startsAt, a.endsAt]);
      }
    }

    const freeBlocks: AvailableSlotDto[] = [];

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
          freeBlocks.push({ start: gapStart.toISOString(), end: gapEnd.toISOString() });
        }

        cursor = new Date(Math.max(cursor.getTime(), oEnd.getTime()));
      }

      if (cursor < blockEnd) {
        freeBlocks.push({ start: cursor.toISOString(), end: blockEnd.toISOString() });
      }
    }

    return freeBlocks;
  }

  private mapSchedule(s: any): ScheduleResponseDto {
    return {
      id: s.id,
      doctorId: s.doctorId,
      serviceLocationId: s.serviceLocationId,
      dayOfWeek: s.dayOfWeek,
      startTime: `${String(s.startTime.getHours()).padStart(2, "0")}:${String(s.startTime.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(s.endTime.getHours()).padStart(2, "0")}:${String(s.endTime.getMinutes()).padStart(2, "0")}`,
      slotDurationMin: s.slotDurationMin,
      isActive: s.isActive,
      maxPatients: s.maxPatients,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  async listAvailableDoctors(organizationId: string) {
    const doctors = await this.prisma.doctor.findMany({
      where: { organizationId },
      include: {
        person: { select: { firstName: true, lastNameP: true, lastNameM: true } },
        schedules: { where: { isActive: true }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
    });

    return doctors
      .filter((d) => d.schedules.length > 0)
      .map((d) => ({
        id: d.id,
        fullName: `${d.person.firstName} ${d.person.lastNameP}${d.person.lastNameM ? " " + d.person.lastNameM : ""}`,
        cedulaProfesional: d.cedulaProfesional,
        specialtyCode: d.specialtyCode,
      }));
  }

  async listAvailableServices(organizationId: string) {
    return this.prisma.service.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, code: true, name: true, defaultPrice: true, currency: true, durationMin: true },
      orderBy: { name: "asc" },
    });
  }
}

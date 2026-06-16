import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsService } from "../reports/reports.service";
import { PdfService } from "../pdf/pdf.service";
import { MailService } from "../mail/mail.service";
import type { CreateReportScheduleDto, UpdateReportScheduleDto } from "./dto/report-schedule.dto";

@Injectable()
export class ReportScheduleService {
  private readonly logger = new Logger(ReportScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly pdf: PdfService,
    private readonly mail: MailService,
  ) {}

  async create(organizationId: string, dto: CreateReportScheduleDto) {
    return this.prisma.reportSchedule.create({
      data: {
        organizationId,
        name: dto.name,
        reportType: dto.reportType,
        cronExpression: dto.cronExpression,
        recipients: JSON.stringify(dto.recipients),
        format: dto.format ?? "pdf",
      },
    });
  }

  async findAll(organizationId: string) {
    const rows = await this.prisma.reportSchedule.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({ ...r, recipients: JSON.parse(r.recipients) }));
  }

  async update(organizationId: string, id: string, dto: UpdateReportScheduleDto) {
    const existing = await this.prisma.reportSchedule.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException("Programacion no encontrada");
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.cronExpression !== undefined) data.cronExpression = dto.cronExpression;
    if (dto.recipients !== undefined) data.recipients = JSON.stringify(dto.recipients);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.reportSchedule.update({ where: { id }, data });
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.prisma.reportSchedule.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundException("Programacion no encontrada");
    await this.prisma.reportSchedule.delete({ where: { id } });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processSchedules() {
    const schedules = await this.prisma.reportSchedule.findMany({ where: { isActive: true } });
    for (const s of schedules) {
      if (this.shouldRun(s.cronExpression, s.lastSentAt)) {
        try {
          await this.generateAndSend(s);
          await this.prisma.reportSchedule.update({
            where: { id: s.id },
            data: { lastSentAt: new Date() },
          });
          this.logger.log(`Reporte "${s.name}" generado y enviado`);
        } catch (err) {
          this.logger.error(`Error en reporte "${s.name}"`, err);
        }
      }
    }
  }

  private shouldRun(cron: string, lastSentAt: Date | null): boolean {
    if (!lastSentAt) return true;
    const parts = cron.split(" ");
    if (parts.length !== 6) return false;
    const diff = Date.now() - lastSentAt.getTime();
    if (parts[1] === "*" && parts[2] === "*") return diff >= 60000;
    if (parts[2] === "*" && parts[3] === "*") return diff >= 3600000;
    if (parts[3] === "*") return diff >= 86400000;
    return diff >= 604800000;
  }

  private async generateAndSend(schedule: any) {
    const orgId = schedule.organizationId;
    const now = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    let pdfBuffer: Buffer;
    let subject: string;

    switch (schedule.reportType) {
      case "revenue": {
        const data = await this.reports.revenue(orgId, monthStart, now);
        const displayData = { ...data, from: monthStart, to: now, groups: data.groups ?? undefined, groupBy: undefined };
        pdfBuffer = await this.pdf.generateRevenueReport(displayData as any);
        subject = `Reporte de Ingresos — ${monthStart} a ${now}`;
        break;
      }
      case "appointments": {
        const data = await this.reports.appointments(orgId, monthStart, now);
        pdfBuffer = await this.pdf.generateAppointmentsReport({ ...data, from: monthStart, to: now });
        subject = `Reporte de Citas — ${monthStart} a ${now}`;
        break;
      }
      case "patients": {
        const data = await this.reports.patients(orgId, monthStart, now);
        pdfBuffer = await this.pdf.generatePatientsReport({ ...data, from: monthStart, to: now });
        subject = `Reporte de Pacientes — ${monthStart} a ${now}`;
        break;
      }
      case "doctors": {
        const docs = await this.reports.doctors(orgId, monthStart, now);
        pdfBuffer = await this.pdf.generateDoctorsReport(docs);
        subject = `Reporte de Medicos — ${monthStart} a ${now}`;
        break;
      }
      default:
        return;
    }

    const recipients = JSON.parse(schedule.recipients) as string[];
    await this.mail.sendReport(recipients, subject, `Adjunto reporte programado: ${schedule.name}`, pdfBuffer, `reporte-${schedule.reportType}-${now}.pdf`);
  }

  async trigger(organizationId: string, id: string) {
    const s = await this.prisma.reportSchedule.findFirst({ where: { id, organizationId } });
    if (!s) throw new NotFoundException("Programacion no encontrada");
    await this.generateAndSend(s);
    await this.prisma.reportSchedule.update({ where: { id }, data: { lastSentAt: new Date() } });
  }
}

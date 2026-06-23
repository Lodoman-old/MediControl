import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { PushService } from "./push/push.service";
import type { CreateNotificationDto, SendNotificationDto } from "./dto/notification.dto";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly whatsapp: WhatsappService,
    private readonly push: PushService,
    private readonly config: ConfigService,
  ) {}

  async create(organizationId: string, dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId: dto.userId,
        channel: dto.channel as any,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        referenceType: dto.referenceType ?? null,
        referenceId: dto.referenceId ?? null,
      },
    });

    if (dto.channel === "EMAIL") {
      await this.sendEmail(organizationId, notification.id, dto);
    } else if (dto.channel === "WHATSAPP") {
      await this.sendWhatsApp(organizationId, notification.id, dto);
    } else if (dto.channel === "PUSH") {
      await this.sendPush(organizationId, notification.id, dto);
    } else {
      await this.markSent(notification.id);
    }

    return notification;
  }

  async sendFromTemplate(organizationId: string, dto: SendNotificationDto) {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: { organizationId, code: dto.templateCode, isActive: true },
    });
    if (!template) throw new NotFoundException(`Template "${dto.templateCode}" no encontrado`);

    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, organizationId },
      include: { person: true, patient: true },
    });
    if (!user) throw new NotFoundException("Usuario no encontrado");

    const message = this.mail.renderTemplate(template.content, dto.variables);
    const subject = template.subject
      ? this.mail.renderTemplate(template.subject, dto.variables)
      : null;

    const notification = await this.prisma.notification.create({
      data: {
        organizationId,
        userId: dto.userId,
        channel: dto.channel as any,
        type: template.type,
        title: subject ?? template.code,
        message,
        referenceType: null,
        referenceId: null,
      },
    });

    if (dto.channel === "EMAIL") {
      const email = user.email;
      const ok = await this.mail.send({ to: email, subject: subject ?? "", html: message });
      await this.logDelivery(organizationId, notification.id, dto.channel, email, subject ?? "", message, ok);
    } else if (dto.channel === "WHATSAPP") {
      const phone = user.phoneE164;
      if (phone) {
        const ok = await this.whatsapp.sendTextMessage(phone, message);
        await this.logDelivery(organizationId, notification.id, dto.channel, phone, "", message, ok);
      }
    }

    if (dto.channel !== "IN_APP") {
      await this.updateStatus(notification.id, "SENT");
    }

    return notification;
  }

  async findAll(organizationId: string, userId: string, filter: { type?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId, userId };
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;

    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where: where as any }),
      this.prisma.notification.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const unread = await this.prisma.notification.count({
      where: { organizationId, userId, readAt: null },
    });

    return {
      data: notifications,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unread,
    };
  }

  async markAsRead(organizationId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Notificacion no encontrada");
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date(), status: "READ" },
    });
  }

  async markAllAsRead(organizationId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { organizationId, userId, readAt: null },
      data: { readAt: new Date(), status: "READ" },
    });
    return { ok: true };
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Notificacion no encontrada");
    await this.prisma.notification.delete({ where: { id } });
    return { ok: true };
  }

  async getUnreadCount(organizationId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: { organizationId, userId, readAt: null },
    });
    return { count };
  }

  async createTemplate(organizationId: string, dto: any) {
    return this.prisma.notificationTemplate.create({
      data: {
        organizationId,
        code: dto.code,
        name: dto.name,
        channel: dto.channel,
        type: dto.type,
        subject: dto.subject ?? null,
        content: dto.content,
        variables: dto.variables ?? [],
      },
    });
  }

  async updateTemplate(organizationId: string, id: string, dto: any) {
    const existing = await this.prisma.notificationTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Template no encontrado");
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.variables !== undefined) data.variables = dto.variables;
    if (dto.isActive !== undefined) data.isActive = dto.isActive === "true";
    return this.prisma.notificationTemplate.update({ where: { id }, data: data as any });
  }

  async listTemplates(organizationId: string) {
    return this.prisma.notificationTemplate.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getLogs(organizationId: string, filter: { page?: number; limit?: number }) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      this.prisma.notificationLog.count({ where: { organizationId } }),
      this.prisma.notificationLog.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { data: logs, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async sendAppointmentReminders() {
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

    const reminders = await this.prisma.appointmentReminder.findMany({
      where: {
        status: "PENDING",
        scheduledFor: { lte: inOneHour },
      },
      include: {
        appointment: {
          include: {
            patient: { include: { person: true } },
            doctor: { include: { person: true } },
            organization: true,
          },
        },
      },
    });

    for (const reminder of reminders) {
      try {
        const appointment = reminder.appointment;
        const orgId = appointment.organizationId;
        const patientName = appointment.patient?.person
          ? `${appointment.patient.person.firstName} ${appointment.patient.person.lastNameP}`
          : "Paciente";
        const doctorName = appointment.doctor?.person
          ? `${appointment.doctor.person.firstName} ${appointment.doctor.person.lastNameP}`
          : "Medico";
        const dateStr = appointment.startsAt.toLocaleDateString("es-MX", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        });
        const timeStr = appointment.startsAt.toLocaleTimeString("es-MX", {
          hour: "2-digit", minute: "2-digit",
        });

        const user = await this.prisma.user.findFirst({
          where: { patient: { id: appointment.patientId }, organizationId: orgId },
        });

        if (reminder.reminderType === "EMAIL" && user?.email) {
          const html = `<h2>Recordatorio de Cita</h2><p>Hola ${patientName},</p><p>Te recordamos que tienes una cita el <strong>${dateStr}</strong> a las <strong>${timeStr}</strong> con el Dr. ${doctorName}.</p>`;
          const ok = await this.mail.send({ to: user.email, subject: "Recordatorio de Cita", html });
          await this.updateReminderStatus(reminder.id, ok ? "SENT" : "FAILED", ok ? null : "Error al enviar");
          await this.create(orgId, {
            userId: user.id,
            channel: "EMAIL",
            type: "APPOINTMENT_REMINDER",
            title: "Recordatorio de Cita",
            message: `Tienes una cita el ${dateStr} a las ${timeStr} con Dr. ${doctorName}.`,
            referenceType: "appointment",
            referenceId: appointment.id,
          });
        } else if (reminder.reminderType === "WHATSAPP" && user?.phoneE164) {
          const ok = await this.whatsapp.sendTextMessage(
            user.phoneE164,
            `MediControl: Recordatorio de cita\nPaciente: ${patientName}\nFecha: ${dateStr}\nHora: ${timeStr}\nDoctor: ${doctorName}`,
          );
          await this.updateReminderStatus(reminder.id, ok ? "SENT" : "FAILED", ok ? null : "Error al enviar");
        } else {
          await this.updateReminderStatus(reminder.id, "SENT", "Sin canal disponible");
        }
      } catch (err) {
        this.logger.error(`Error procesando recordatorio ${reminder.id}`, err);
        await this.updateReminderStatus(reminder.id, "FAILED", (err as Error).message);
      }
    }
  }

  async registerDevice(organizationId: string, userId: string, token: string, platform: string) {
    const existing = await this.prisma.deviceToken.findUnique({
      where: { userId_token: { userId, token } },
    });
    if (existing) {
      return this.prisma.deviceToken.update({
        where: { id: existing.id },
        data: { isActive: true, platform },
      });
    }
    return this.prisma.deviceToken.create({
      data: { organizationId, userId, token, platform },
    });
  }

  async unregisterDevice(userId: string, token: string) {
    const existing = await this.prisma.deviceToken.findUnique({
      where: { userId_token: { userId, token } },
    });
    if (existing) {
      await this.prisma.deviceToken.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }
    return { ok: true };
  }

  async getUserDeviceTokens(userId: string): Promise<string[]> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });
    return tokens.map((t) => t.token);
  }

  async sendPushToUser(userId: string, title: string, body: string, data?: Record<string, string>) {
    const tokens = await this.getUserDeviceTokens(userId);
    if (tokens.length === 0) return { success: 0, failed: 0 };
    return this.push.sendToMultipleDevices(tokens, { title, body, data });
  }

  private async sendPush(organizationId: string, notificationId: string, dto: CreateNotificationDto) {
    const tokens = await this.getUserDeviceTokens(dto.userId);
    if (tokens.length === 0) {
      await this.markSent(notificationId);
      return;
    }
    const result = await this.push.sendToMultipleDevices(tokens, {
      title: dto.title,
      body: dto.message,
      data: {
        type: dto.type,
        referenceType: dto.referenceType ?? "",
        referenceId: dto.referenceId ?? "",
      },
    });
    await this.logDelivery(organizationId, notificationId, "PUSH", `tokens:${tokens.length}`, dto.title, dto.message, result.failed === 0);
    await this.updateStatus(notificationId, result.failed === 0 ? "SENT" : "FAILED");
  }

  private async sendEmail(organizationId: string, notificationId: string, dto: CreateNotificationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user?.email) return;
    const ok = await this.mail.send({ to: user.email, subject: dto.title, html: dto.message });
    await this.logDelivery(organizationId, notificationId, "EMAIL", user.email, dto.title, dto.message, ok);
  }

  private async sendWhatsApp(organizationId: string, notificationId: string, dto: CreateNotificationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user?.phoneE164) return;
    const ok = await this.whatsapp.sendTextMessage(user.phoneE164, `${dto.title}\n\n${dto.message}`);
    await this.logDelivery(organizationId, notificationId, "WHATSAPP", user.phoneE164, dto.title, dto.message, ok);
  }

  private async logDelivery(
    organizationId: string,
    notificationId: string | null,
    channel: string,
    recipient: string,
    subject: string,
    body: string,
    success: boolean,
  ) {
    await this.prisma.notificationLog.create({
      data: {
        organizationId,
        notificationId,
        channel: channel as any,
        recipient,
        subject: subject || null,
        body: body || null,
        status: success ? "SENT" : "FAILED",
        errorMessage: success ? null : "Delivery failed",
        sentAt: new Date(),
      },
    });
  }

  private async markSent(id: string) {
    await this.prisma.notification.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  private async updateStatus(id: string, status: string) {
    await this.prisma.notification.update({
      where: { id },
      data: { status: status as any, sentAt: new Date() },
    });
  }

  private async updateReminderStatus(id: string, status: string, errorMessage: string | null) {
    await this.prisma.appointmentReminder.update({
      where: { id },
      data: {
        status,
        sentAt: status === "SENT" ? new Date() : null,
        errorMessage,
      },
    });
  }
}

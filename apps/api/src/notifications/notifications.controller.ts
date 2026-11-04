import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import {
  CreateNotificationDto,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  SendNotificationDto,
  NotificationFilterDto,
} from "./dto/notification.dto";
import { RegisterDeviceDto, UnregisterDeviceDto } from "./dto/device-token.dto";
import { WebPushSubscribeDto, WebPushUnsubscribeDto } from "./web-push/web-push.dto";

@ApiTags("Notificaciones")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @Post()
  @ApiOperation({ summary: "Crear y enviar notificacion" })
  async create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateNotificationDto) {
    return this.svc.create(u.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Post("send-template")
  @ApiOperation({ summary: "Enviar notificacion desde template" })
  async sendFromTemplate(@CurrentUser() u: AuthenticatedUser, @Body() dto: SendNotificationDto) {
    return this.svc.sendFromTemplate(u.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @Get()
  @ApiOperation({ summary: "Listar notificaciones del usuario" })
  async findAll(@CurrentUser() u: AuthenticatedUser, @Query() filter: NotificationFilterDto) {
    return this.svc.findAll(u.organizationId, u.userId, {
      type: filter.type,
      status: filter.status,
      page: filter.page ? Number(filter.page) : undefined,
      limit: filter.limit ? Number(filter.limit) : undefined,
    });
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @Get("unread-count")
  @ApiOperation({ summary: "Contar notificaciones no leidas" })
  async getUnreadCount(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getUnreadCount(u.organizationId, u.userId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @Get("push-config")
  @ApiOperation({
    summary: "Configuracion publica de Firebase para inicializar push en la APK",
  })
  async pushConfig(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getPushClientConfig(u.organizationId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @Get("web-push-config")
  @ApiOperation({ summary: "Configuracion publica de Web Push para la PWA" })
  async webPushConfig(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.getWebPushConfig(u.organizationId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @Post("web-push/subscribe")
  @ApiOperation({ summary: "Registrar suscripcion Web Push del navegador" })
  async webPushSubscribe(
    @CurrentUser() u: AuthenticatedUser,
    @Body() dto: WebPushSubscribeDto,
  ) {
    return this.svc.subscribeWebPush(u.organizationId, u.userId, {
      endpoint: dto.endpoint,
      p256dh: dto.p256dh,
      auth: dto.auth,
      userAgent: dto.userAgent,
    });
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @Post("web-push/unsubscribe")
  @ApiOperation({ summary: "Desactivar suscripcion Web Push del navegador" })
  async webPushUnsubscribe(
    @CurrentUser() u: AuthenticatedUser,
    @Body() dto: WebPushUnsubscribeDto,
  ) {
    return this.svc.unsubscribeWebPush(u.userId, dto.endpoint);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @Patch(":id/read")
  @ApiOperation({ summary: "Marcar notificacion como leida" })
  async markAsRead(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string) {
    return this.svc.markAsRead(u.organizationId, id);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @Patch("read-all")
  @ApiOperation({ summary: "Marcar todas como leidas" })
  async markAllAsRead(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.markAllAsRead(u.organizationId, u.userId);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Delete(":id")
  @ApiOperation({ summary: "Eliminar notificacion" })
  async remove(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string) {
    return this.svc.remove(u.organizationId, id);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Post("run-reminders")
  @ApiOperation({ summary: "Procesar ahora los recordatorios pendientes de la clinica" })
  async runReminders(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.sendAppointmentReminders(u.organizationId);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Post("templates")
  @ApiOperation({ summary: "Crear template de notificacion" })
  async createTemplate(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateNotificationTemplateDto) {
    return this.svc.createTemplate(u.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Get("templates")
  @ApiOperation({ summary: "Listar templates" })
  async listTemplates(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.listTemplates(u.organizationId);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch("templates/:id")
  @ApiOperation({ summary: "Actualizar template" })
  async updateTemplate(
    @CurrentUser() u: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.svc.updateTemplate(u.organizationId, id, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @Post("register-device")
  @ApiOperation({ summary: "Registrar token de dispositivo para push notifications" })
  async registerDevice(@CurrentUser() u: AuthenticatedUser, @Body() dto: RegisterDeviceDto) {
    return this.svc.registerDevice(u.organizationId, u.userId, dto.token, dto.platform);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @Post("unregister-device")
  @ApiOperation({ summary: "Desregistrar token de dispositivo" })
  async unregisterDevice(@CurrentUser() u: AuthenticatedUser, @Body() dto: UnregisterDeviceDto) {
    return this.svc.unregisterDevice(u.userId, dto.token);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Get("logs")
  @ApiOperation({ summary: "Ver historial de envios" })
  async getLogs(@CurrentUser() u: AuthenticatedUser, @Query() filter: NotificationFilterDto) {
    return this.svc.getLogs(u.organizationId, {
      page: filter.page ? Number(filter.page) : undefined,
      limit: filter.limit ? Number(filter.limit) : undefined,
    });
  }
}

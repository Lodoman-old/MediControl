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

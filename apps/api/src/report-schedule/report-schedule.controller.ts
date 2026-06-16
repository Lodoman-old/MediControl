import { Controller, Get, Post, Patch, Delete, Body, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ReportScheduleService } from "./report-schedule.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CreateReportScheduleDto, UpdateReportScheduleDto } from "./dto/report-schedule.dto";

@ApiTags("Reportes Programados")
@ApiBearerAuth()
@Controller("report-schedules")
export class ReportScheduleController {
  constructor(private readonly svc: ReportScheduleService) {}

  @Roles("SUPERADMIN", "ADMIN")
  @Post()
  @ApiOperation({ summary: "Crear programacion de reporte" })
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateReportScheduleDto) {
    return this.svc.create(u.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Get()
  @ApiOperation({ summary: "Listar programaciones" })
  findAll(@CurrentUser() u: AuthenticatedUser) {
    return this.svc.findAll(u.organizationId);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch(":id")
  @ApiOperation({ summary: "Actualizar programacion" })
  update(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateReportScheduleDto) {
    return this.svc.update(u.organizationId, id, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Delete(":id")
  @ApiOperation({ summary: "Eliminar programacion" })
  remove(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string) {
    return this.svc.remove(u.organizationId, id);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Post(":id/trigger")
  @ApiOperation({ summary: "Ejecutar reporte manualmente" })
  trigger(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string) {
    return this.svc.trigger(u.organizationId, id);
  }
}

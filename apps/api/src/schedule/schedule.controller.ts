import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { ScheduleService } from "./schedule.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  CreateScheduleExceptionDto,
  UpdateScheduleExceptionDto,
  AvailableSlotsQueryDto,
} from "./dto/schedule.dto";

@ApiTags("Agenda / Horarios")
@ApiBearerAuth()
@Controller("schedule")
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Listar horarios semanales" })
  @Get()
  async listSchedules(
    @CurrentUser() user: AuthenticatedUser,
    @Query("doctorId") doctorId?: string,
  ) {
    return this.schedule.listSchedules(user.organizationId, doctorId);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Crear horario semanal" })
  @Post()
  async createSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schedule.createSchedule(user.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Actualizar horario semanal" })
  @Patch(":id")
  async updateSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedule.updateSchedule(user.organizationId, id, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Eliminar horario semanal" })
  @Delete(":id")
  async deleteSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.schedule.deleteSchedule(user.organizationId, id);
    return { message: "Horario eliminado" };
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Listar excepciones de horario" })
  @Get("exceptions")
  async listExceptions(
    @CurrentUser() user: AuthenticatedUser,
    @Query("doctorId") doctorId?: string,
  ) {
    return this.schedule.listExceptions(user.organizationId, doctorId);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Crear excepcion de horario" })
  @Post("exceptions")
  async createException(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScheduleExceptionDto,
  ) {
    return this.schedule.createException(user.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Eliminar excepcion de horario" })
  @Delete("exceptions/:id")
  async deleteException(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.schedule.deleteException(user.organizationId, id);
    return { message: "Excepcion eliminada" };
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Obtener slots disponibles para un medico y fecha" })
  @Get("available-slots")
  async getAvailableSlots(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AvailableSlotsQueryDto,
  ) {
    return this.schedule.getAvailableSlots(user.organizationId, query);
  }

  @Roles("PATIENT")
  @ApiOperation({ summary: "Listar doctores disponibles", description: "Lista los medicos disponibles para agendar cita." })
  @Get("doctors")
  async listAvailableDoctors(@CurrentUser() user: AuthenticatedUser) {
    return this.schedule.listAvailableDoctors(user.organizationId);
  }

  @Roles("PATIENT")
  @ApiOperation({ summary: "Listar servicios disponibles", description: "Lista los servicios medicos disponibles." })
  @Get("services")
  async listAvailableServices(@CurrentUser() user: AuthenticatedUser) {
    return this.schedule.listAvailableServices(user.organizationId);
  }
}

import { Controller, Get, Post, Patch, Body, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { AppointmentService } from "./appointment.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import {
  CreateAppointmentDto,
  ConfirmAppointmentDto,
  UpdateAppointmentDto,
  AppointmentFilterDto,
  TriageVitalsDto,
} from "./dto/appointment.dto";
import { SelfScheduleDto } from "../auth/dto/self-schedule.dto";

@ApiTags("Agenda / Citas")
@ApiBearerAuth()
@Controller("appointments")
export class AppointmentController {
  constructor(private readonly appointment: AppointmentService) {}

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @ApiOperation({ summary: "Listar citas con filtros" })
  @Get()
  async listAppointments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: AppointmentFilterDto,
  ) {
    return this.appointment.listAppointments(user.organizationId, filter);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @ApiOperation({ summary: "Obtener cita por ID" })
  @Get(":id")
  async getAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.appointment.getAppointment(user.organizationId, id);
  }

  @Roles("SUPERADMIN", "ADMIN", "RECEPTION")
  @ApiOperation({ summary: "Crear cita" })
  @Post()
  async createAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointment.createAppointment(user.organizationId, dto, user.userId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @ApiOperation({ summary: "Actualizar cita (status, reprogramar)" })
  @Patch(":id")
  async updateAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointment.updateAppointment(user.organizationId, id, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @ApiOperation({ summary: "Resumen diario de agenda" })
  @Get("day/:date")
  async getDaySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param("date") date: string,
  ) {
    return this.appointment.getDaySummary(user.organizationId, date);
  }

  @Roles("PATIENT")
  @ApiOperation({ summary: "Mis citas", description: "Obtiene las citas del paciente autenticado." })
  @Get("me/list")
  async getMyAppointments(@CurrentUser() user: AuthenticatedUser) {
    return this.appointment.getPatientAppointments(user.organizationId, user.userId);
  }

  @Roles("PATIENT")
  @ApiOperation({ summary: "Auto-agendar cita", description: "El paciente agenda su propia cita." })
  @Post("self")
  async selfSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelfScheduleDto,
  ) {
    return this.appointment.selfSchedule(user.organizationId, user.userId, dto);
  }

  @Roles("PATIENT")
  @ApiOperation({ summary: "Cancelar mi cita", description: "El paciente cancela su propia cita." })
  @Patch(":id/cancel")
  async cancelMyAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.appointment.cancelPatientAppointment(user.organizationId, user.userId, id);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Citas del doctor autenticado", description: "Lista las citas del medico autenticado para hoy." })
  @Get("doctor/me")
  async getDoctorAppointments(@CurrentUser() user: AuthenticatedUser) {
    return this.appointment.getDoctorAppointments(user.organizationId, user.userId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Citas pendientes del doctor", description: "Citas que requieren confirmacion del medico." })
  @Get("doctor/me/pending")
  async getPendingDoctorAppointments(@CurrentUser() user: AuthenticatedUser) {
    return this.appointment.getPendingDoctorAppointments(user.organizationId, user.userId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Confirmar cita", description: "El medico confirma la cita y asigna la ubicacion." })
  @Patch(":id/confirm")
  async confirmAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ConfirmAppointmentDto,
  ) {
    return this.appointment.confirmAppointment(user.organizationId, user.userId, id, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Iniciar consulta", description: "Cambia el estado de la cita a IN_CONSULT." })
  @Patch(":id/start-consult")
  async startConsult(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.appointment.startConsult(user.organizationId, user.userId, id);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Finalizar consulta", description: "Completa la cita y opcionalmente crea nota SOAP." })
  @Patch(":id/complete-consult")
  async completeConsult(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.appointment.completeConsult(user.organizationId, user.userId, id);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Registrar inasistencia", description: "Marca la cita como NO_SHOW." })
  @Patch(":id/no-show")
  async markNoShow(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.appointment.markNoShow(user.organizationId, user.userId, id);
  }

  @Roles("SUPERADMIN", "ADMIN", "NURSE")
  @ApiOperation({ summary: "Realizar triage", description: "La enfermera captura signos vitales y pasa la cita a IN_TRIAGE." })
  @Patch(":id/triage")
  async triageAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: TriageVitalsDto,
  ) {
    return this.appointment.triageAppointment(user.organizationId, user.userId, id, dto);
  }
}

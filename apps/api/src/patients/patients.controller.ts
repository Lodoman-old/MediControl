import { Controller, Get, Patch, Post, Param, Query, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PatientsService } from "./patients.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { UpdatePatientProfileDto } from "../auth/dto/register.dto";
import { CreatePatientByStaffDto } from "./dto/create-patient-staff.dto";

@ApiTags("Pacientes")
@ApiBearerAuth()
@Controller("patients")
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Roles("SUPERADMIN", "ADMIN", "RECEPTION")
  @ApiOperation({ summary: "Registrar paciente", description: "Crea un nuevo paciente con usuario y persona." })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPatient(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePatientByStaffDto,
  ) {
    return this.patients.createPatientByStaff(user.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @ApiOperation({ summary: "Listar pacientes", description: "Lista paginada de pacientes." })
  @Get()
  async listPatients(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    return this.patients.listPatients(user.organizationId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Mi expediente", description: "Obtiene el expediente del paciente autenticado (para pacientes)." })
  @Get("me")
  async getMyPatient(@CurrentUser() user: AuthenticatedUser) {
    return this.patients.getMyPatient(user.organizationId, user.userId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Actualizar mi perfil", description: "Actualiza datos de perfil del paciente autenticado." })
  @Patch("me")
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patients.updateProfile(user.organizationId, user.userId, dto);
  }

  @Roles("PATIENT")
  @ApiOperation({ summary: "Mi historial medico", description: "Obtiene el historial medico completo del paciente autenticado (citas, diagnosticos, recetas, estudios)." })
  @Get("me/medical-history")
  async getMyMedicalHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.patients.getMedicalHistory(user.organizationId, user.userId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @ApiOperation({ summary: "Obtener paciente", description: "Detalle de un paciente por ID." })
  @Get(":id")
  async getPatient(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.patients.getPatient(user.organizationId, id);
  }
}

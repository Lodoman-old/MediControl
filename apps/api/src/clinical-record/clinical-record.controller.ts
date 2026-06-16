import { Controller, Get, Post, Patch, Body, Param, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import type { Response } from "express";
import { ClinicalRecordService } from "./clinical-record.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import {
  CreateClinicalNoteDto,
  UpdateClinicalNoteDto,
  CreateDiagnosisDto,
  UpdateDiagnosisDto,
  CreateTreatmentDto,
  UpdateTreatmentDto,
  CreateConsentDto,
  CreateLabOrderDto,
  UpdateLabOrderDto,
  CreateLabResultDto,
  UpdateMedicalHistoryDto,
} from "./dto/clinical-record.dto";

@ApiTags("Expediente Clinico")
@ApiBearerAuth()
@Controller("clinical-records")
export class ClinicalRecordController {
  constructor(private readonly clinical: ClinicalRecordService) {}

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "PATIENT")
  @ApiOperation({ summary: "Obtener expediente completo del paciente" })
  @Get(":patientId")
  async getFullRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
  ) {
    return this.clinical.getFullRecord(user.organizationId, patientId, user);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Actualizar historia medica (antecedentes, padecimiento)" })
  @Patch(":patientId/history")
  async updateHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Body() dto: UpdateMedicalHistoryDto,
  ) {
    return this.clinical.updateHistory(user.organizationId, patientId, dto);
  }

  // --- CLINICAL NOTES ---

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Crear nota de evolucion (SOAP)" })
  @Post(":patientId/notes")
  async createNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Body() dto: CreateClinicalNoteDto,
  ) {
    return this.clinical.createNote(user.organizationId, patientId, user.userId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Listar notas de evolucion" })
  @Get(":patientId/notes")
  async listNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
  ) {
    return this.clinical.listNotes(user.organizationId, patientId, user);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Obtener nota de evolucion por ID" })
  @Get(":patientId/notes/:noteId")
  async getNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Param("noteId") noteId: string,
  ) {
    return this.clinical.getNote(user.organizationId, patientId, noteId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Actualizar nota de evolucion" })
  @Patch(":patientId/notes/:noteId")
  async updateNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Param("noteId") noteId: string,
    @Body() dto: UpdateClinicalNoteDto,
  ) {
    return this.clinical.updateNote(user.organizationId, patientId, noteId, dto);
  }

  // --- DIAGNOSES ---

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Crear diagnostico" })
  @Post(":patientId/diagnoses")
  async createDiagnosis(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Body() dto: CreateDiagnosisDto,
  ) {
    return this.clinical.createDiagnosis(user.organizationId, patientId, user.userId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Listar diagnosticos" })
  @Get(":patientId/diagnoses")
  async listDiagnoses(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
  ) {
    return this.clinical.listDiagnoses(user.organizationId, patientId, user);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Actualizar diagnostico" })
  @Patch(":patientId/diagnoses/:diagnosisId")
  async updateDiagnosis(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Param("diagnosisId") diagnosisId: string,
    @Body() dto: UpdateDiagnosisDto,
  ) {
    return this.clinical.updateDiagnosis(user.organizationId, patientId, diagnosisId, dto);
  }

  // --- TREATMENTS ---

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Crear tratamiento" })
  @Post(":patientId/treatments")
  async createTreatment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Body() dto: CreateTreatmentDto,
  ) {
    return this.clinical.createTreatment(user.organizationId, patientId, user.userId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Listar tratamientos" })
  @Get(":patientId/treatments")
  async listTreatments(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
  ) {
    return this.clinical.listTreatments(user.organizationId, patientId, user);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Actualizar tratamiento" })
  @Patch(":patientId/treatments/:treatmentId")
  async updateTreatment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Param("treatmentId") treatmentId: string,
    @Body() dto: UpdateTreatmentDto,
  ) {
    return this.clinical.updateTreatment(user.organizationId, patientId, treatmentId, dto);
  }

  // --- CONSENTS ---

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Crear consentimiento informado" })
  @Post(":patientId/consents")
  async createConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Body() dto: CreateConsentDto,
  ) {
    return this.clinical.createConsent(user.organizationId, patientId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Listar consentimientos" })
  @Get(":patientId/consents")
  async listConsents(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
  ) {
    return this.clinical.listConsents(user.organizationId, patientId, user);
  }

  // --- LAB ORDERS ---

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Crear solicitud de estudio" })
  @Post(":patientId/lab-orders")
  async createLabOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Body() dto: CreateLabOrderDto,
  ) {
    return this.clinical.createLabOrder(user.organizationId, patientId, user.userId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Listar solicitudes de estudio" })
  @Get(":patientId/lab-orders")
  async listLabOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
  ) {
    return this.clinical.listLabOrders(user.organizationId, patientId, user);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Actualizar solicitud de estudio" })
  @Patch(":patientId/lab-orders/:orderId")
  async updateLabOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Param("orderId") orderId: string,
    @Body() dto: UpdateLabOrderDto,
  ) {
    return this.clinical.updateLabOrder(user.organizationId, patientId, orderId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Agregar resultado a solicitud de estudio" })
  @Post(":patientId/lab-orders/:orderId/results")
  async createLabResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Param("orderId") orderId: string,
    @Body() dto: CreateLabResultDto,
  ) {
    return this.clinical.createLabResult(user.organizationId, patientId, orderId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Descargar solicitud de estudio en PDF" })
  @Get(":patientId/lab-orders/:orderId/pdf")
  async getLabOrderPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param("patientId") patientId: string,
    @Param("orderId") orderId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.clinical.generateLabOrderPdf(user.organizationId, orderId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="solicitud-estudio-${orderId.slice(0, 8)}.pdf"`,
      "Content-Length": pdf.length,
    });
    res.end(pdf);
  }
}

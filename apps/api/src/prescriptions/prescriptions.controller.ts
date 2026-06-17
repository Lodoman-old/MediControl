import { Controller, Get, Post, Patch, Delete, Body, Param, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { PrescriptionsService } from "./prescriptions.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CreatePrescriptionDto, UpdatePrescriptionDto, SignPrescriptionDto } from "./dto/prescriptions.dto";

@ApiTags("Recetas")
@ApiBearerAuth()
@Controller("prescriptions")
export class PrescriptionsController {
  constructor(private readonly rx: PrescriptionsService) {}

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Crear receta medica" })
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePrescriptionDto) {
    return this.rx.create(user.organizationId, user.userId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Listar recetas de un paciente" })
  @Get("patient/:patientId")
  async findByPatient(@CurrentUser() user: AuthenticatedUser, @Param("patientId") patientId: string) {
    return this.rx.findByPatient(user.organizationId, patientId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Descargar todas las recetas activas de un paciente en un solo PDF" })
  @Get("patient/:patientId/pdf")
  async getPatientPdf(@CurrentUser() user: AuthenticatedUser, @Param("patientId") patientId: string, @Res() res: Response) {
    const pdf = await this.rx.generatePatientPdf(user.organizationId, patientId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recetas-${patientId.slice(0, 8)}.pdf"`,
      "Content-Length": pdf.length,
    });
    res.end(pdf);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Obtener receta por ID" })
  @Get(":id")
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.rx.findOne(user.organizationId, id);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Actualizar receta" })
  @Patch(":id")
  async update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdatePrescriptionDto) {
    return this.rx.update(user.organizationId, id, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Firmar receta digitalmente" })
  @Post(":id/sign")
  async sign(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: SignPrescriptionDto) {
    return this.rx.sign(user.organizationId, id, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION", "PATIENT")
  @ApiOperation({ summary: "Descargar receta en PDF" })
  @Get(":id/pdf")
  async getPdf(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Res() res: Response) {
    const pdf = await this.rx.generatePdf(user.organizationId, id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receta-${id.slice(0, 8)}.pdf"`,
      "Content-Length": pdf.length,
    });
    res.end(pdf);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Cancelar receta" })
  @Delete(":id")
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.rx.remove(user.organizationId, id);
  }
}

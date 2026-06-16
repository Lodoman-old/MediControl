import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import type {
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
  VitalSignDto,
} from "./dto/clinical-record.dto";
import PDFDocument from "pdfkit";

@Injectable()
export class ClinicalRecordService {
  private readonly logger = new Logger(ClinicalRecordService.name);

  constructor(private readonly prisma: PrismaService) {}

  // --- MEDICAL RECORD ---

  private async verifyPatientAccess(patientId: string, user: AuthenticatedUser) {
    if (!user.roles.includes("PATIENT")) return;
    const patient = await this.prisma.patient.findFirst({
      where: { userId: user.userId },
    });
    if (!patient || patient.id !== patientId) {
      throw new ForbiddenException("No tienes acceso a este expediente");
    }
  }

  async findOrCreate(organizationId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, organizationId },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    let record = await this.prisma.medicalRecord.findUnique({
      where: { patientId },
    });

    if (!record) {
      record = await this.prisma.medicalRecord.create({
        data: { organizationId, patientId },
      });
      this.logger.log(`Expediente creado: ${record.id} (paciente ${patientId})`);
    }

    return record;
  }

  async getFullRecord(organizationId: string, patientId: string, user: AuthenticatedUser) {
    await this.verifyPatientAccess(patientId, user);
    await this.findOrCreate(organizationId, patientId);

    return this.prisma.medicalRecord.findUnique({
      where: { patientId },
      include: {
        clinicalNotes: {
          include: {
            vitalSigns: true,
            createdBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
          },
          orderBy: { noteDate: "desc" },
        },
        diagnoses: {
          include: {
            diagnosedBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
          },
          orderBy: { diagnosedAt: "desc" },
        },
        treatments: { orderBy: { startDate: "desc" } },
        consents: { orderBy: { createdAt: "desc" } },
        labOrders: {
          include: { results: true },
          orderBy: { orderedAt: "desc" },
        },
      },
    });
  }

  async updateHistory(organizationId: string, patientId: string, dto: UpdateMedicalHistoryDto) {
    const record = await this.findOrCreate(organizationId, patientId);
    return this.prisma.medicalRecord.update({
      where: { id: record.id },
      data: {
        ...(dto.familyHistory !== undefined && { familyHistory: dto.familyHistory }),
        ...(dto.nonPathologicalHistory !== undefined && { nonPathologicalHistory: dto.nonPathologicalHistory }),
        ...(dto.pathologicalHistory !== undefined && { pathologicalHistory: dto.pathologicalHistory }),
        ...(dto.currentIllness !== undefined && { currentIllness: dto.currentIllness }),
        ...(dto.systemsReview !== undefined && { systemsReview: dto.systemsReview }),
      },
    });
  }

  // --- CLINICAL NOTES ---

  async createNote(organizationId: string, patientId: string, userId: string, dto: CreateClinicalNoteDto) {
    const record = await this.findOrCreate(organizationId, patientId);

    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, organizationId },
      });
      if (!appt) throw new NotFoundException("Cita no encontrada");
    }

    const note = await this.prisma.clinicalNote.create({
      data: {
        organizationId,
        medicalRecordId: record.id,
        appointmentId: dto.appointmentId ?? null,
        noteDate: new Date(dto.noteDate),
        subjective: dto.subjective ?? null,
        objective: dto.objective ?? null,
        assessment: dto.assessment ?? null,
        plan: dto.plan ?? null,
        createdById: userId,
        ...(dto.vitalSigns ? {
          vitalSigns: {
            create: this.mapVitalSignsData(organizationId, dto.vitalSigns),
          },
        } : {}),
      },
      include: { vitalSigns: true },
    });

    this.logger.log(`Nota clinica creada: ${note.id} (expediente ${record.id})`);
    return note;
  }

  async listNotes(organizationId: string, patientId: string, user?: AuthenticatedUser) {
    if (user) await this.verifyPatientAccess(patientId, user);
    const record = await this.findOrCreate(organizationId, patientId);
    return this.prisma.clinicalNote.findMany({
      where: { medicalRecordId: record.id },
      include: {
        vitalSigns: true,
        createdBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
      },
      orderBy: { noteDate: "desc" },
    });
  }

  async getNote(organizationId: string, patientId: string, noteId: string) {
    const record = await this.findOrCreate(organizationId, patientId);
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id: noteId, medicalRecordId: record.id },
      include: {
        vitalSigns: true,
        createdBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
      },
    });
    if (!note) throw new NotFoundException("Nota clinica no encontrada");
    return note;
  }

  async updateNote(organizationId: string, patientId: string, noteId: string, dto: UpdateClinicalNoteDto) {
    const record = await this.findOrCreate(organizationId, patientId);
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id: noteId, medicalRecordId: record.id },
    });
    if (!note) throw new NotFoundException("Nota clinica no encontrada");

    return this.prisma.clinicalNote.update({
      where: { id: noteId },
      data: {
        ...(dto.subjective !== undefined && { subjective: dto.subjective }),
        ...(dto.objective !== undefined && { objective: dto.objective }),
        ...(dto.assessment !== undefined && { assessment: dto.assessment }),
        ...(dto.plan !== undefined && { plan: dto.plan }),
      },
    });
  }

  // --- DIAGNOSES ---

  async createDiagnosis(organizationId: string, patientId: string, userId: string, dto: CreateDiagnosisDto) {
    const record = await this.findOrCreate(organizationId, patientId);

    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, organizationId },
      });
      if (!appt) throw new NotFoundException("Cita no encontrada");
    }

    return this.prisma.diagnosis.create({
      data: {
        organizationId,
        medicalRecordId: record.id,
        appointmentId: dto.appointmentId ?? null,
        icd10Code: dto.icd10Code,
        description: dto.description,
        type: dto.type ?? "PRINCIPAL",
        status: dto.status ?? "ACTIVE",
        diagnosedById: userId,
      },
    });
  }

  async listDiagnoses(organizationId: string, patientId: string, user?: AuthenticatedUser) {
    if (user) await this.verifyPatientAccess(patientId, user);
    const record = await this.findOrCreate(organizationId, patientId);
    return this.prisma.diagnosis.findMany({
      where: { medicalRecordId: record.id },
      include: {
        diagnosedBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
      },
      orderBy: { diagnosedAt: "desc" },
    });
  }

  async updateDiagnosis(organizationId: string, patientId: string, diagnosisId: string, dto: UpdateDiagnosisDto) {
    const record = await this.findOrCreate(organizationId, patientId);
    const diag = await this.prisma.diagnosis.findFirst({
      where: { id: diagnosisId, medicalRecordId: record.id },
    });
    if (!diag) throw new NotFoundException("Diagnostico no encontrado");

    return this.prisma.diagnosis.update({
      where: { id: diagnosisId },
      data: {
        ...(dto.icd10Code !== undefined && { icd10Code: dto.icd10Code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  // --- TREATMENTS ---

  async createTreatment(organizationId: string, patientId: string, userId: string, dto: CreateTreatmentDto) {
    const record = await this.findOrCreate(organizationId, patientId);
    return this.prisma.treatment.create({
      data: {
        organizationId,
        medicalRecordId: record.id,
        description: dto.description,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        indications: dto.indications ?? null,
        status: dto.status ?? "ACTIVE",
        createdById: userId,
      },
    });
  }

  async listTreatments(organizationId: string, patientId: string, user?: AuthenticatedUser) {
    if (user) await this.verifyPatientAccess(patientId, user);
    const record = await this.findOrCreate(organizationId, patientId);
    return this.prisma.treatment.findMany({
      where: { medicalRecordId: record.id },
      orderBy: { startDate: "desc" },
    });
  }

  async updateTreatment(organizationId: string, patientId: string, treatmentId: string, dto: UpdateTreatmentDto) {
    const record = await this.findOrCreate(organizationId, patientId);
    const tx = await this.prisma.treatment.findFirst({
      where: { id: treatmentId, medicalRecordId: record.id },
    });
    if (!tx) throw new NotFoundException("Tratamiento no encontrado");

    return this.prisma.treatment.update({
      where: { id: treatmentId },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.indications !== undefined && { indications: dto.indications }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  // --- CONSENTS ---

  async createConsent(organizationId: string, patientId: string, dto: CreateConsentDto) {
    const record = await this.findOrCreate(organizationId, patientId);
    return this.prisma.informedConsent.create({
      data: {
        organizationId,
        medicalRecordId: record.id,
        consentType: dto.consentType,
        description: dto.description,
        signedAt: dto.signedAt ? new Date(dto.signedAt) : null,
        signedByPatientId: dto.signedByPatientId ?? null,
        witnessedById: dto.witnessedById ?? null,
        documentUrl: dto.documentUrl ?? null,
      },
    });
  }

  async listConsents(organizationId: string, patientId: string, user?: AuthenticatedUser) {
    if (user) await this.verifyPatientAccess(patientId, user);
    const record = await this.findOrCreate(organizationId, patientId);
    return this.prisma.informedConsent.findMany({
      where: { medicalRecordId: record.id },
      orderBy: { createdAt: "desc" },
    });
  }

  // --- LAB ORDERS ---

  async createLabOrder(organizationId: string, patientId: string, userId: string, dto: CreateLabOrderDto) {
    const record = await this.findOrCreate(organizationId, patientId);
    return this.prisma.labOrder.create({
      data: {
        organizationId,
        medicalRecordId: record.id,
        studyType: dto.studyType,
        studyName: dto.studyName,
        indication: dto.indication ?? null,
        orderedById: userId,
      },
    });
  }

  async listLabOrders(organizationId: string, patientId: string, user?: AuthenticatedUser) {
    if (user) await this.verifyPatientAccess(patientId, user);
    const record = await this.findOrCreate(organizationId, patientId);
    return this.prisma.labOrder.findMany({
      where: { medicalRecordId: record.id },
      include: { results: true },
      orderBy: { orderedAt: "desc" },
    });
  }

  async updateLabOrder(organizationId: string, patientId: string, orderId: string, dto: UpdateLabOrderDto) {
    const record = await this.findOrCreate(organizationId, patientId);
    const order = await this.prisma.labOrder.findFirst({
      where: { id: orderId, medicalRecordId: record.id },
    });
    if (!order) throw new NotFoundException("Solicitud no encontrada");

    return this.prisma.labOrder.update({
      where: { id: orderId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { results: true },
    });
  }

  async createLabResult(organizationId: string, patientId: string, orderId: string, dto: CreateLabResultDto) {
    const record = await this.findOrCreate(organizationId, patientId);
    const order = await this.prisma.labOrder.findFirst({
      where: { id: orderId, medicalRecordId: record.id },
    });
    if (!order) throw new NotFoundException("Solicitud no encontrada");

    return this.prisma.labResult.create({
      data: {
        labOrderId: orderId,
        resultDate: dto.resultDate ? new Date(dto.resultDate) : new Date(),
        resultText: dto.resultText ?? null,
        resultFileUrl: dto.resultFileUrl ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  // --- HELPERS ---

  private mapVitalSignsData(organizationId: string, dto: VitalSignDto) {
    return {
      organizationId,
      bloodPressureSystolic: dto.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: dto.bloodPressureDiastolic ?? null,
      heartRate: dto.heartRate ?? null,
      respiratoryRate: dto.respiratoryRate ?? null,
      temperature: dto.temperature ?? null,
      oxygenSaturation: dto.oxygenSaturation ?? null,
      weight: dto.weight ?? null,
      height: dto.height ?? null,
      glucose: dto.glucose ?? null,
      notes: dto.notes ?? null,
    };
  }

  async generateLabOrderPdf(organizationId: string, orderId: string): Promise<Buffer> {
    const order = await this.prisma.labOrder.findFirst({
      where: { id: orderId, organizationId },
      include: {
        medicalRecord: {
          include: { patient: { include: { person: true } } },
        },
        orderedBy: {
          include: { person: true, doctor: true },
        },
      },
    });
    if (!order) throw new NotFoundException("Solicitud de estudio no encontrada");

    const patientName = order.medicalRecord?.patient?.person
      ? `${order.medicalRecord.patient.person.firstName} ${order.medicalRecord.patient.person.lastNameP} ${order.medicalRecord.patient.person.lastNameM ?? ""}`.trim()
      : "Paciente";
    const doctorName = order.orderedBy?.person
      ? `${order.orderedBy.person.firstName} ${order.orderedBy.person.lastNameP} ${order.orderedBy.person.lastNameM ?? ""}`.trim()
      : "Medico";
    const cedula = order.orderedBy?.doctor?.cedulaProfesional ?? "";

    const studyTypeLabels: Record<string, string> = {
      LABORATORY: "Laboratorio",
      IMAGING: "Imagen",
      PATHOLOGY: "Patologia",
      OTHER: "Otro",
    };

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: "LETTER" });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(9).fillColor("#666").text("MediControl", { align: "right" }).fillColor("#000");

      doc.moveDown(2);
      doc.fontSize(16).font("Helvetica-Bold").text("SOLICITUD DE ESTUDIO", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor("#888").text("Folio: " + order.id.slice(0, 8).toUpperCase(), { align: "center" }).fillColor("#000");
      doc.moveDown(1.5);

      doc.fontSize(10);
      doc.font("Helvetica-Bold").text("DATOS DEL MEDICO SOLICITANTE", { underline: true });
      doc.font("Helvetica");
      doc.text(`Nombre: ${doctorName}`);
      doc.text(`Cedula profesional: ${cedula || "N/A"}`);
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("DATOS DEL PACIENTE", { underline: true });
      doc.font("Helvetica");
      doc.text(`Nombre: ${patientName}`);
      doc.text(`Fecha de solicitud: ${order.orderedAt.toLocaleDateString("es-MX")}`);
      doc.moveDown(1.5);

      doc.font("Helvetica-Bold").text("ESTUDIO SOLICITADO", { underline: true });
      doc.font("Helvetica");
      doc.moveDown(0.5);
      doc.fontSize(11).font("Helvetica-Bold").text(order.studyName);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Tipo: ${studyTypeLabels[order.studyType] ?? order.studyType}`);
      if (order.indication) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").text("Indicacion clinica:");
        doc.font("Helvetica").text(order.indication, { indent: 10 });
      }

      doc.moveDown(3);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke("#ccc");
      doc.moveDown(0.5);

      doc.fontSize(9).fillColor("#333").text("Sello / Firma del medico:", { align: "right" });
      doc.moveDown(1.5);
      doc.moveTo(doc.page.width - 160, doc.y).lineTo(doc.page.width - 50, doc.y).stroke("#999");

      doc.moveDown(2);
      doc.fontSize(8).fillColor("#999").text("Documento de solicitud de estudio clinico. Entregar al laboratorio.", { align: "center" });
      doc.fillColor("#000");

      doc.end();
    });
  }
}

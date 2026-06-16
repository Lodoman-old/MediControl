import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreatePrescriptionDto, UpdatePrescriptionDto, SignPrescriptionDto } from "./dto/prescriptions.dto";
import PDFDocument from "pdfkit";

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreatePrescriptionDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, organizationId },
    });
    if (!patient) throw new NotFoundException("Paciente no encontrado");

    const doctor = await this.prisma.doctor.findFirst({
      where: { userId, organizationId },
    });
    if (!doctor) throw new ForbiddenException("Solo medicos pueden crear recetas");

    if (dto.medicalRecordId) {
      const record = await this.prisma.medicalRecord.findFirst({
        where: { id: dto.medicalRecordId, organizationId },
      });
      if (!record) throw new NotFoundException("Expediente no encontrado");
    }

    return this.prisma.prescription.create({
      data: {
        organizationId,
        medicalRecordId: dto.medicalRecordId ?? null,
        patientId: dto.patientId,
        doctorId: doctor.id,
        medication: dto.medication,
        dosage: dto.dosage,
        frequency: dto.frequency,
        duration: dto.duration ?? null,
        route: dto.route ?? "ORAL",
        quantity: dto.quantity ?? null,
        refills: dto.refills ?? 0,
        indications: dto.indications ?? null,
        notes: dto.notes ?? null,
      },
      include: {
        patient: { include: { person: true } },
        doctor: { include: { person: true } },
      },
    });
  }

  async findByPatient(organizationId: string, patientId: string) {
    return this.prisma.prescription.findMany({
      where: { organizationId, patientId },
      include: {
        doctor: { include: { person: true } },
      },
      orderBy: { prescribedAt: "desc" },
    });
  }

  async findOne(organizationId: string, id: string) {
    const p = await this.prisma.prescription.findFirst({
      where: { id, organizationId },
      include: {
        patient: { include: { person: true } },
        doctor: { include: { person: true } },
      },
    });
    if (!p) throw new NotFoundException("Receta no encontrada");
    return p;
  }

  async update(organizationId: string, id: string, dto: UpdatePrescriptionDto) {
    const existing = await this.findOne(organizationId, id);
    return this.prisma.prescription.update({
      where: { id: existing.id },
      data: {
        ...(dto.medication !== undefined && { medication: dto.medication }),
        ...(dto.dosage !== undefined && { dosage: dto.dosage }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.route !== undefined && { route: dto.route }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.refills !== undefined && { refills: dto.refills }),
        ...(dto.indications !== undefined && { indications: dto.indications }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        patient: { include: { person: true } },
        doctor: { include: { person: true } },
      },
    });
  }

  async sign(organizationId: string, id: string, dto: SignPrescriptionDto) {
    const existing = await this.findOne(organizationId, id);
    return this.prisma.prescription.update({
      where: { id: existing.id },
      data: { digitalSignature: dto.signature },
    });
  }

  async generatePdf(organizationId: string, id: string): Promise<Buffer> {
    const p = await this.prisma.prescription.findFirst({
      where: { id, organizationId },
      include: {
        patient: { include: { person: true } },
        doctor: { include: { person: true } },
      },
    });
    if (!p) throw new NotFoundException("Receta no encontrada");

    const patientName = p.patient?.person
      ? `${p.patient.person.firstName} ${p.patient.person.lastNameP} ${p.patient.person.lastNameM ?? ""}`.trim()
      : "Paciente";
    const doctorName = p.doctor?.person
      ? `${p.doctor.person.firstName} ${p.doctor.person.lastNameP} ${p.doctor.person.lastNameM ?? ""}`.trim()
      : "Medico";
    const cedula = p.doctor?.cedulaProfesional ?? "";

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: "LETTER" });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width - 100;

      doc.fontSize(9).fillColor("#666").text("MediControl", 50, 30, { align: "right" }).fillColor("#000");

      doc.moveDown(2);
      doc.fontSize(16).font("Helvetica-Bold").text("RECETA MEDICA", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor("#888").text("Folio: " + p.id.slice(0, 8).toUpperCase(), { align: "center" }).fillColor("#000");
      doc.moveDown(1.5);

      doc.fontSize(10);
      doc.font("Helvetica-Bold").text("DATOS DEL MEDICO", { underline: true });
      doc.font("Helvetica");
      doc.text(`Nombre: ${doctorName}`);
      doc.text(`Cedula profesional: ${cedula || "N/A"}`);
      doc.moveDown(1);

      doc.font("Helvetica-Bold").text("DATOS DEL PACIENTE", { underline: true });
      doc.font("Helvetica");
      doc.text(`Nombre: ${patientName}`);
      doc.text(`Fecha de expedicion: ${p.prescribedAt.toLocaleDateString("es-MX")}`);
      doc.moveDown(1.5);

      doc.font("Helvetica-Bold").text("PRESCRIPCION", { underline: true });
      doc.font("Helvetica");
      doc.moveDown(0.5);

      doc.fontSize(11).font("Helvetica-Bold").text(p.medication);
      doc.fontSize(10).font("Helvetica");
      const lineX = doc.x;
      let lineY = doc.y;

      doc.text(`Presentacion / Dosis: ${p.dosage}`, { indent: 10 });
      doc.text(`Frecuencia: ${p.frequency}`, { indent: 10 });
      if (p.route) doc.text(`Via de administracion: ${p.route}`, { indent: 10 });
      if (p.duration) doc.text(`Duracion: ${p.duration}`, { indent: 10 });
      if (p.quantity) doc.text(`Cantidad: ${p.quantity}`, { indent: 10 });
      if (p.refills && p.refills > 0) doc.text(`Refrendos: ${p.refills}`, { indent: 10 });

      if (p.indications) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").text("Indicaciones:");
        doc.font("Helvetica").text(p.indications, { indent: 10 });
      }
      if (p.notes) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").text("Notas:");
        doc.font("Helvetica").text(p.notes, { indent: 10 });
      }

      doc.moveDown(2);

      doc.moveTo(50, doc.y).lineTo(pageWidth + 50, doc.y).stroke("#ccc");
      doc.moveDown(0.5);

      if (p.digitalSignature) {
        doc.fontSize(9).fillColor("#333");
        doc.text("Firma electronica (digital):", { align: "right" });
        doc.fontSize(8).fillColor("#888").text(`Firmado digitalmente - ${new Date().toLocaleDateString("es-MX")}`, { align: "right" });
        doc.fillColor("#000");
      } else {
        doc.fontSize(9).fillColor("#333");
        doc.text("Firma del medico:", { align: "right" });
        doc.moveDown(1.5);
        doc.moveTo(pageWidth - 60, doc.y).lineTo(pageWidth + 50, doc.y).stroke("#999");
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor("#888").text("Firma autografa del medico", { align: "right" }).fillColor("#000");
      }

      doc.moveDown(2);
      doc.fontSize(8).fillColor("#999").text("Esta receta es valida unicamente con la firma del medico. Sujeto a las disposiciones de la NOM-072-SSA3-2012.", { align: "center" });
      doc.fillColor("#000");

      doc.end();
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.findOne(organizationId, id);
    await this.prisma.prescription.update({
      where: { id: existing.id },
      data: { status: "CANCELLED" },
    });
    return { deleted: true };
  }
}

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
        patient: {
          include: { person: true },
        },
        doctor: {
          include: { person: true, organization: true },
        },
      },
    });
    if (!p) throw new NotFoundException("Receta no encontrada");

    const patientPerson = p.patient?.person;
    const doctorPerson = p.doctor?.person;

    const patientName = patientPerson
      ? `${patientPerson.firstName} ${patientPerson.lastNameP} ${patientPerson.lastNameM ?? ""}`.trim()
      : "Paciente";
    const doctorName = doctorPerson
      ? `${doctorPerson.firstName} ${doctorPerson.lastNameP} ${doctorPerson.lastNameM ?? ""}`.trim()
      : "Medico";
    const cedulaProfesional = p.doctor?.cedulaProfesional ?? "";
    const cedulaEspecialidad = p.doctor?.cedulaEspecialidad ?? "";
    const specialtyCode = p.doctor?.specialtyCode ?? "";

    const orgName = p.doctor?.organization?.legalName ?? "";
    const fiscalAddress = p.doctor?.organization?.fiscalAddress as Record<string, any> | null;
    const addressStr = fiscalAddress
      ? [
          fiscalAddress.street,
          fiscalAddress.exteriorNumber && `Ext.${fiscalAddress.exteriorNumber}`,
          fiscalAddress.interiorNumber && `Int.${fiscalAddress.interiorNumber}`,
          fiscalAddress.neighborhood,
          fiscalAddress.city,
          fiscalAddress.state,
          fiscalAddress.zipCode && `C.P. ${fiscalAddress.zipCode}`,
        ]
          .filter(Boolean)
          .join(", ")
      : "";

    const age = patientPerson?.birthDate
      ? Math.floor(
          (new Date().getTime() - new Date(patientPerson.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        )
      : null;

    const specialtyName = specialtyCode
      ? specialtyCode.replace(/_/g, " ")
      : "";

    const vitalSigns = await this.prisma.vitalSign.findFirst({
      where: {
        appointment: { patientId: p.patientId },
      },
      orderBy: { measuredAt: "desc" },
    });

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: "LETTER" });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const pw = doc.page.width - 100;
      const margin = 50;

      // ── DOCTOR HEADER (centered, decreasing font sizes, ALL CAPS) ──
      const centerX = doc.page.width / 2;

      doc.fontSize(18).font("Helvetica-Bold").fillColor("#000");
      doc.text("DR. " + doctorName.toUpperCase(), { align: "center" });

      doc.moveDown(0.3);
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#222");
      doc.text(specialtyName.toUpperCase() || "MEDICINA GENERAL", { align: "center" });

      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").fillColor("#444");
      doc.text(
        `CÉDULA PROFESIONAL: ${cedulaProfesional || "N/A"}    CÉDULA ESPECIALIDAD: ${cedulaEspecialidad || "N/A"}    SSG: ${orgName || "N/A"}`,
        { align: "center" },
      );

      doc.moveDown(0.2);
      doc.fontSize(8.5).font("Helvetica").fillColor("#777");
      doc.text(`DOMICILIO: ${addressStr || orgName || "N/A"}`, { align: "center" });

      // ── SEPARATOR ──
      doc.moveDown(0.8);
      doc.fillColor("#ccc");
      doc.moveTo(margin, doc.y).lineTo(margin + pw, doc.y).stroke("#bbb");
      doc.moveDown(0.6);

      // ── PATIENT INFO LINE ──
      doc.fillColor("#000");
      doc.fontSize(10).font("Helvetica");
      const dateStr = p.prescribedAt.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const ageStr = age !== null ? `${age} años` : "";
      doc.text(
        `PACIENTE: ${patientName.toUpperCase()}    ${ageStr ? `EDAD: ${ageStr}    ` : ""}FECHA: ${dateStr.toUpperCase()}`,
        { align: "left" },
      );

      doc.moveDown(0.6);

      // ── VITAL SIGNS ──
      if (vitalSigns) {
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333");
        doc.text("SIGNOS VITALES:", { align: "left" });
        doc.fontSize(8.5).font("Helvetica").fillColor("#555");
        const vs: string[] = [];
        if (vitalSigns.bloodPressureSystolic) vs.push(`TA: ${vitalSigns.bloodPressureSystolic}/${vitalSigns.bloodPressureDiastolic ?? "?"} mmHg`);
        if (vitalSigns.heartRate) vs.push(`FC: ${vitalSigns.heartRate} lpm`);
        if (vitalSigns.respiratoryRate) vs.push(`FR: ${vitalSigns.respiratoryRate} rpm`);
        if (vitalSigns.temperature) vs.push(`TEMP: ${Number(vitalSigns.temperature).toFixed(1)} °C`);
        if (vitalSigns.oxygenSaturation) vs.push(`SpO2: ${vitalSigns.oxygenSaturation}%`);
        if (vitalSigns.weight) vs.push(`PESO: ${Number(vitalSigns.weight).toFixed(1)} kg`);
        if (vitalSigns.height) vs.push(`TALLA: ${Number(vitalSigns.height).toFixed(1)} cm`);
        if (vitalSigns.glucose) vs.push(`GLU: ${vitalSigns.glucose} mg/dL`);
        if (vs.length > 0) doc.text(vs.join("   |   "), { align: "left" });
        doc.fillColor("#000");
        doc.moveDown(0.5);
      }

      // ── MEDICATIONS ──
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#111");
      doc.text(p.medication, { align: "left" });
      doc.moveDown(0.2);
      doc.fontSize(9.5).font("Helvetica").fillColor("#333");
      const rxFields: string[] = [
        `DOSIS: ${p.dosage}`,
        `FRECUENCIA: ${p.frequency}`,
      ];
      if (p.route) rxFields.push(`VIA: ${p.route}`);
      if (p.duration) rxFields.push(`DURACION: ${p.duration}`);
      if (p.quantity) rxFields.push(`CANTIDAD: ${p.quantity}`);
      if (p.refills && p.refills > 0) rxFields.push(`REFRENDOS: ${p.refills}`);
      doc.text(rxFields.join("   "), { indent: 10 });

      if (p.indications) {
        doc.moveDown(0.2);
        const indStr = `INDICACIONES: ${p.indications}`;
        doc.text(indStr, { indent: 10 });
      }

      if (p.notes) {
        doc.moveDown(0.3);
        doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#333");
        doc.text("NOTAS:", { align: "left" });
        doc.fontSize(9.5).font("Helvetica").fillColor("#444");
        doc.text(p.notes, { indent: 10 });
      }

      doc.fillColor("#000");

      // ── SIGNATURE + NEXT APPOINTMENT ──
      doc.moveDown(1.5);
      doc.fillColor("#ccc");
      doc.moveTo(margin, doc.y).lineTo(margin + pw, doc.y).stroke("#bbb");
      doc.moveDown(0.8);

      const sigY = doc.y;

      // Left: Signature
      doc.fillColor("#333");
      doc.fontSize(9).font("Helvetica");

      if (p.digitalSignature) {
        doc.text("FIRMA ELECTRÓNICA (DIGITAL):", margin, sigY, { align: "left" });
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor("#888");
        doc.text(`Firmado digitalmente — ${new Date().toLocaleDateString("es-MX")}`, margin, doc.y, { align: "left" });
        doc.fillColor("#000");
      } else {
        doc.text("FIRMA DEL MÉDICO:", margin, sigY, { align: "left" });
        doc.moveDown(1.2);
        doc.fillColor("#999");
        doc.moveTo(margin, doc.y).lineTo(margin + 200, doc.y).stroke("#999");
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor("#999");
        doc.text("Firma autógrafa del médico", margin, doc.y, { align: "left" });
        doc.fillColor("#000");
      }

      const leftBottomY = doc.y;

      // Right: Next appointment
      const rightX = doc.page.width / 2 + 20;
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#333");
      doc.text("PRÓXIMA CITA:", rightX, sigY, { align: "left" });
      doc.moveDown(2);
      const nextApptY = doc.y;
      doc.fillColor("#999");
      doc.moveTo(rightX, doc.y).lineTo(rightX + 200, doc.y).stroke("#999");
      doc.moveDown(0.3);
      doc.fontSize(8).font("Helvetica").fillColor("#999");
      doc.text("Fecha de seguimiento", rightX, doc.y, { align: "left" });
      doc.fillColor("#000");

      const rightBottomY = doc.y;
      doc.y = Math.max(leftBottomY, rightBottomY);
      doc.moveDown(1.5);

      // ── FOOTER ──
      doc.fontSize(7.5).fillColor("#aaa");
      doc.text(
        "Esta receta es válida únicamente con la firma del médico. Sujeto a las disposiciones de la NOM-072-SSA3-2012.",
        { align: "center" },
      );
      doc.moveDown(0.2);
      doc.fontSize(7).fillColor("#bbb");
      doc.text(`Folio: ${p.id.slice(0, 8).toUpperCase()}  |  MediControl`, { align: "center" });
      doc.fillColor("#000");

      doc.end();
    });
  }

  async generatePatientPdf(organizationId: string, patientId: string): Promise<Buffer> {
    const prescriptions = await this.prisma.prescription.findMany({
      where: { organizationId, patientId, status: "ACTIVE" },
      include: {
        patient: { include: { person: true } },
        doctor: { include: { person: true, organization: true } },
      },
      orderBy: { prescribedAt: "desc" },
    });
    if (!prescriptions.length) throw new NotFoundException("No hay recetas activas para este paciente");

    const p = prescriptions[0];
    const patientPerson = p.patient?.person;
    const doctorPerson = p.doctor?.person;

    const patientName = patientPerson
      ? `${patientPerson.firstName} ${patientPerson.lastNameP} ${patientPerson.lastNameM ?? ""}`.trim()
      : "Paciente";
    const doctorName = doctorPerson
      ? `${doctorPerson.firstName} ${doctorPerson.lastNameP} ${doctorPerson.lastNameM ?? ""}`.trim()
      : "Medico";
    const cedulaProfesional = p.doctor?.cedulaProfesional ?? "";
    const cedulaEspecialidad = p.doctor?.cedulaEspecialidad ?? "";
    const specialtyCode = p.doctor?.specialtyCode ?? "";

    const orgName = p.doctor?.organization?.legalName ?? "";
    const fiscalAddress = p.doctor?.organization?.fiscalAddress as Record<string, any> | null;
    const addressStr = fiscalAddress
      ? [
          fiscalAddress.street,
          fiscalAddress.exteriorNumber && `Ext.${fiscalAddress.exteriorNumber}`,
          fiscalAddress.interiorNumber && `Int.${fiscalAddress.interiorNumber}`,
          fiscalAddress.neighborhood,
          fiscalAddress.city,
          fiscalAddress.state,
          fiscalAddress.zipCode && `C.P. ${fiscalAddress.zipCode}`,
        ].filter(Boolean).join(", ")
      : "";

    const age = patientPerson?.birthDate
      ? Math.floor((new Date().getTime() - new Date(patientPerson.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const specialtyName = specialtyCode ? specialtyCode.replace(/_/g, " ") : "";
    const dateStr = p.prescribedAt.toLocaleDateString("es-MX", {
      day: "numeric", month: "long", year: "numeric",
    });

    const vitalSigns = await this.prisma.vitalSign.findFirst({
      where: { appointment: { patientId } },
      orderBy: { measuredAt: "desc" },
    });

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: "LETTER" });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const pw = doc.page.width - 100;
      const margin = 50;

      doc.fontSize(18).font("Helvetica-Bold").fillColor("#000");
      doc.text("DR. " + doctorName.toUpperCase(), { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#222");
      doc.text(specialtyName.toUpperCase() || "MEDICINA GENERAL", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").fillColor("#444");
      doc.text(
        `CÉDULA PROFESIONAL: ${cedulaProfesional || "N/A"}    CÉDULA ESPECIALIDAD: ${cedulaEspecialidad || "N/A"}    SSG: ${orgName || "N/A"}`,
        { align: "center" },
      );
      doc.moveDown(0.2);
      doc.fontSize(8.5).font("Helvetica").fillColor("#777");
      doc.text(`DOMICILIO: ${addressStr || orgName || "N/A"}`, { align: "center" });

      doc.moveDown(0.8);
      doc.fillColor("#ccc");
      doc.moveTo(margin, doc.y).lineTo(margin + pw, doc.y).stroke("#bbb");
      doc.moveDown(0.6);

      doc.fillColor("#000");
      doc.fontSize(10).font("Helvetica");
      const ageStr = age !== null ? `${age} años` : "";
      doc.text(
        `PACIENTE: ${patientName.toUpperCase()}    ${ageStr ? `EDAD: ${ageStr}    ` : ""}FECHA: ${dateStr.toUpperCase()}`,
        { align: "left" },
      );
      doc.moveDown(0.6);

      if (vitalSigns) {
        doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#333");
        doc.text("SIGNOS VITALES:", { align: "left" });
        doc.fontSize(8.5).font("Helvetica").fillColor("#555");
        const vs: string[] = [];
        if (vitalSigns.bloodPressureSystolic) vs.push(`TA: ${vitalSigns.bloodPressureSystolic}/${vitalSigns.bloodPressureDiastolic ?? "?"} mmHg`);
        if (vitalSigns.heartRate) vs.push(`FC: ${vitalSigns.heartRate} lpm`);
        if (vitalSigns.respiratoryRate) vs.push(`FR: ${vitalSigns.respiratoryRate} rpm`);
        if (vitalSigns.temperature) vs.push(`TEMP: ${Number(vitalSigns.temperature).toFixed(1)} °C`);
        if (vitalSigns.oxygenSaturation) vs.push(`SpO2: ${vitalSigns.oxygenSaturation}%`);
        if (vitalSigns.weight) vs.push(`PESO: ${Number(vitalSigns.weight).toFixed(1)} kg`);
        if (vitalSigns.height) vs.push(`TALLA: ${Number(vitalSigns.height).toFixed(1)} cm`);
        if (vitalSigns.glucose) vs.push(`GLU: ${vitalSigns.glucose} mg/dL`);
        if (vs.length > 0) doc.text(vs.join("   |   "), { align: "left" });
        doc.fillColor("#000");
        doc.moveDown(0.5);
      }

      doc.fontSize(11).font("Helvetica-Bold").fillColor("#111");
      doc.text("MEDICAMENTOS PRESCRITOS:", { align: "left" });
      doc.moveDown(0.3);

      for (let i = 0; i < prescriptions.length; i++) {
        const rx = prescriptions[i];
        const yBefore = doc.y;
        if (yBefore > 650) doc.addPage();

        doc.fontSize(10).font("Helvetica-Bold").fillColor("#111");
        doc.text(`${i + 1}. ${rx.medication}`, { indent: 10 });
        doc.fontSize(9).font("Helvetica").fillColor("#333");
        const rxFields: string[] = [
          `DOSIS: ${rx.dosage}`,
          `FRECUENCIA: ${rx.frequency}`,
        ];
        if (rx.route) rxFields.push(`VIA: ${rx.route}`);
        if (rx.duration) rxFields.push(`DURACION: ${rx.duration}`);
        if (rx.quantity) rxFields.push(`CANTIDAD: ${rx.quantity}`);
        if (rx.refills && rx.refills > 0) rxFields.push(`REFRENDOS: ${rx.refills}`);
        doc.text(`   ${rxFields.join("   ")}`, { indent: 20 });
        if (rx.indications) {
          doc.text(`   INDICACIONES: ${rx.indications}`, { indent: 20 });
        }
        doc.moveDown(0.5);
      }

      doc.fillColor("#000");
      doc.moveDown(1);
      doc.fillColor("#ccc");
      doc.moveTo(margin, doc.y).lineTo(margin + pw, doc.y).stroke("#bbb");
      doc.moveDown(0.8);

      const sigY = doc.y;
      doc.fillColor("#333");
      doc.fontSize(9).font("Helvetica");
      doc.text("FIRMA DEL MÉDICO:", margin, sigY, { align: "left" });
      doc.moveDown(1.2);
      doc.fillColor("#999");
      doc.moveTo(margin, doc.y).lineTo(margin + 200, doc.y).stroke("#999");
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor("#999");
      doc.text("Firma autógrafa del médico", margin, doc.y, { align: "left" });
      doc.fillColor("#000");

      const leftBottomY = doc.y;
      const rightX = doc.page.width / 2 + 20;
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#333");
      doc.text("PRÓXIMA CITA:", rightX, sigY, { align: "left" });
      doc.moveDown(2);
      doc.fillColor("#999");
      doc.moveTo(rightX, doc.y).lineTo(rightX + 200, doc.y).stroke("#999");
      doc.moveDown(0.3);
      doc.fontSize(8).font("Helvetica").fillColor("#999");
      doc.text("Fecha de seguimiento", rightX, doc.y, { align: "left" });
      doc.fillColor("#000");

      doc.y = Math.max(leftBottomY, doc.y);
      doc.moveDown(1.5);

      doc.fontSize(7.5).fillColor("#aaa");
      doc.text(
        "Esta receta es válida únicamente con la firma del médico. Sujeto a las disposiciones de la NOM-072-SSA3-2012.",
        { align: "center" },
      );
      doc.moveDown(0.2);
      doc.fontSize(7).fillColor("#bbb");
      doc.text(`Folio: ${p.id.slice(0, 8).toUpperCase()}  |  MediControl`, { align: "center" });
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

import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";

@Injectable()
export class PdfService {
  generateRevenueReport(data: {
    from: string;
    to: string;
    total: number;
    count: number;
    groups?: Record<string, { count: number; total: number }>;
    groupBy?: string;
  }): Promise<Buffer> {
    return new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(18).text("Reporte de Ingresos", { align: "center" });
      doc.fontSize(10).text(`Periodo: ${data.from} — ${data.to}`, { align: "center" });
      doc.moveDown();

      doc.fontSize(12).text(`Total: $${Number(data.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
      doc.text(`Citas pagadas: ${data.count}`);
      doc.text(`Promedio: $${data.count > 0 ? Number(data.total / data.count).toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "0.00"}`);
      doc.moveDown();

      if (data.groups) {
        doc.fontSize(14).text(`Por ${data.groupBy === "doctor" ? "Medico" : "Servicio"}`);
        doc.moveDown(0.5);
        for (const [key, g] of Object.entries(data.groups)) {
          doc.fontSize(10).text(`${key}: ${g.count} citas — $${Number(g.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
        }
      }

      doc.end();
    });
  }

  generateAppointmentsReport(data: {
    from: string;
    to: string;
    total: number;
    byStatus: Record<string, number>;
  }): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(18).text("Reporte de Citas", { align: "center" });
      doc.fontSize(10).text(`Periodo: ${data.from} — ${data.to}`, { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Total de citas: ${data.total}`);
      doc.moveDown();

      const labels: Record<string, string> = {
        SCHEDULED: "Programadas", COMPLETED: "Completadas", CANCELED: "Canceladas",
        NO_SHOW: "Inasistencias", PAID: "Pagadas", CHECKED_IN: "Registradas",
        IN_CONSULT: "En consulta", PAYMENT_PENDING_VALIDATION: "Pago pendiente",
        RESCHEDULED: "Reprogramadas",
      };
      for (const [status, count] of Object.entries(data.byStatus)) {
        doc.fontSize(10).text(`${labels[status] ?? status}: ${count}`);
      }

      doc.end();
    });
  }

  generatePatientsReport(data: {
    from: string;
    to: string;
    totalPatients: number;
    activePatients: number;
    totalVisits: number;
    avgVisitsPerPatient: number;
  }): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(18).text("Reporte de Pacientes", { align: "center" });
      doc.fontSize(10).text(`Periodo: ${data.from} — ${data.to}`, { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Total pacientes: ${data.totalPatients}`);
      doc.text(`Pacientes activos: ${data.activePatients}`);
      doc.text(`Visitas totales: ${data.totalVisits}`);
      doc.text(`Promedio visitas/paciente: ${data.avgVisitsPerPatient}`);

      doc.end();
    });
  }

  generateDoctorsReport(
    doctors: Array<{ name: string; specialty: string; appointments: number; completed: number; revenue: number }>,
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(18).text("Reporte de Productividad Medica", { align: "center" });
      doc.moveDown();

      for (const d of doctors) {
        doc.fontSize(12).text(`${d.name} — ${d.specialty}`);
        doc.fontSize(10).text(`  Citas: ${d.appointments} | Completadas: ${d.completed} | Ingresos: $${Number(d.revenue).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
        doc.moveDown(0.5);
      }

      doc.end();
    });
  }
}

/**
 * Utilidades para enviar mensajes con la app de WhatsApp (sin API).
 *
 * Los enlaces wa.me abren WhatsApp Desktop o la app movil con el texto
 * precargado; el usuario solo confirma el envio. No requieren token ni
 * verificacion de empresa.
 */

export function normalizeWhatsappNumber(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < 10) return null;

  // Mexico: numero local de 10 digitos -> anteponer 52.
  if (digits.length === 10) return `52${digits}`;

  // Formato movil legado 1 + 10 digitos -> 52 + 10 digitos.
  if (digits.length === 11 && digits.startsWith("1")) {
    return `52${digits.slice(1)}`;
  }

  // Mexico ya con lada 52 o 521.
  if (digits.length === 12 && digits.startsWith("52")) return digits;
  if (digits.length === 13 && digits.startsWith("521")) {
    return `52${digits.slice(3)}`;
  }

  return digits;
}

export function buildWhatsappUrl(
  rawPhone: string | null | undefined,
  message: string,
): string | null {
  const phone = normalizeWhatsappNumber(rawPhone);
  if (!phone) return null;
  const text = message.trim();
  return text
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${phone}`;
}

/** Abre WhatsApp con el mensaje precargado. Devuelve false si no hay telefono valido. */
export function openWhatsapp(
  rawPhone: string | null | undefined,
  message = "",
): boolean {
  const url = buildWhatsappUrl(rawPhone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function firstName(fullName?: string | null): string {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0] ?? "";
}

interface AppointmentMessageInput {
  patientName?: string | null;
  startsAt: string;
  doctorName?: string | null;
  location?: string | null;
  clinicName?: string | null;
}

export function buildAppointmentMessage({
  patientName,
  startsAt,
  doctorName,
  location,
  clinicName,
}: AppointmentMessageInput): string {
  const date = new Date(startsAt);
  const dateText = date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeText = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines: string[] = [];
  lines.push(`Hola ${firstName(patientName) || ""}, le recordamos su cita${clinicName ? ` en ${clinicName}` : ""}:`);
  lines.push("");
  lines.push(`Fecha: ${dateText}`);
  lines.push(`Hora: ${timeText}`);
  if (doctorName) lines.push(`Medico: ${doctorName}`);
  if (location) lines.push(`Lugar: ${location}`);
  lines.push("");
  lines.push("Si no puede asistir, por favor avisenos.");
  return lines.join("\n");
}

export function buildPatientGreeting(patientName?: string | null, clinicName?: string | null): string {
  const name = firstName(patientName);
  return `Hola${name ? ` ${name}` : ""}, le saludamos de${clinicName ? ` ${clinicName}` : " su clinica"}. En que podemos ayudarle?`;
}

interface PrescriptionLine {
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string | null;
  route?: string | null;
  indications?: string | null;
}

export function buildPrescriptionMessage({
  patientName,
  prescriptions,
  doctorName,
}: {
  patientName?: string | null;
  prescriptions: PrescriptionLine[];
  doctorName?: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`Hola ${firstName(patientName) || ""}, le compartimos su receta medica:`);
  lines.push("");
  prescriptions.forEach((p, index) => {
    lines.push(`${index + 1}) ${p.medication} ${p.dosage}`.trim());
    lines.push(`   Frecuencia: ${p.frequency}`);
    if (p.duration) lines.push(`   Duracion: ${p.duration}`);
    if (p.route) lines.push(`   Via: ${p.route}`);
    if (p.indications) lines.push(`   Indicaciones: ${p.indications}`);
    lines.push("");
  });
  if (doctorName) lines.push(`Medico: ${doctorName}`);
  lines.push("Recuerde seguir las indicaciones de su medico.");
  return lines.join("\n");
}

export function buildDoctorAppointmentMessage({
  doctorName,
  patientName,
  startsAt,
  serviceName,
  location,
}: {
  doctorName?: string | null;
  patientName?: string | null;
  startsAt: string;
  serviceName?: string | null;
  location?: string | null;
}): string {
  const date = new Date(startsAt);
  const dateText = date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeText = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const doctor = doctorName
    ? /^dr\.?\s/i.test(doctorName)
      ? doctorName
      : `Dr. ${doctorName}`
    : "Doctor";

  const lines: string[] = [];
  lines.push(`Hola ${doctor}, le confirmamos una cita asignada:`);
  lines.push("");
  lines.push(`Paciente: ${patientName ?? ""}`);
  lines.push(`Fecha: ${dateText}`);
  lines.push(`Hora: ${timeText}`);
  if (serviceName) lines.push(`Servicio: ${serviceName}`);
  if (location) lines.push(`Lugar: ${location}`);
  lines.push("");
  lines.push("Por favor confirme su disponibilidad.");
  return lines.join("\n");
}

interface PaymentReceiptInput {
  patientName?: string | null;
  amount: number | string;
  currency?: string | null;
  methodLabel?: string | null;
  reference?: string | null;
  serviceName?: string | null;
  branchName?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export function buildPaymentReceiptMessage({
  patientName,
  amount,
  currency,
  methodLabel,
  reference,
  serviceName,
  branchName,
  paidAt,
  createdAt,
}: PaymentReceiptInput): string {
  const total = Number(amount).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const date = new Date(paidAt ?? createdAt);
  const dateText = date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeText = date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines: string[] = [];
  lines.push(`Hola ${firstName(patientName) || ""}, le compartimos el recibo de su pago:`);
  lines.push("");
  if (serviceName) lines.push(`Concepto: ${serviceName}`);
  lines.push(`Monto: $${total} ${currency ?? "MXN"}`);
  if (methodLabel) lines.push(`Metodo: ${methodLabel}`);
  if (reference) lines.push(`Folio: ${reference}`);
  if (branchName) lines.push(`Sucursal: ${branchName}`);
  lines.push(`Fecha: ${dateText} ${timeText}`);
  lines.push("");
  lines.push("Gracias por su preferencia.");
  return lines.join("\n");
}

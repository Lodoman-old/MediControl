const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Administrador",
  DOCTOR: "Doctor",
  NURSE: "Enfermero",
  RECEPTION: "Recepcion",
  CAJERO: "Cajero",
  PATIENT: "Paciente",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function roleLabels(roles: string[]): string {
  return roles.map(roleLabel).join(", ");
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  POS: "Terminal",
  SPEI: "SPEI",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};

export function methodLabel(method: string): string {
  return METHOD_LABELS[method] ?? method;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING_DOCTOR_CONFIRMATION: "Pendiente",
  SCHEDULED: "Programada",
  PAYMENT_PENDING_VALIDATION: "Pago pendiente",
  PAID: "Pagada",
  CHECKED_IN: "Registrada",
  IN_TRIAGE: "En triage",
  IN_CONSULT: "En consulta",
  COMPLETED: "Completada",
  CANCELED: "Cancelada",
  NO_SHOW: "Inasistencia",
};

export function appointmentStatusLabel(status: string): string {
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}

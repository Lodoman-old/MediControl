export interface TicketOrganization {
  legalName: string;
  displayName?: string | null;
  rfc?: string | null;
  phone?: string | null;
  email?: string | null;
  fiscalAddress?: unknown;
}

export interface TicketBranch {
  name: string;
  address?: unknown;
  phone?: string | null;
}

export interface TicketLine {
  description: string;
  detail?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TicketData {
  title: string;
  folio: string;
  date: Date | string;
  status?: string | null;
  paymentMethod?: string | null;
  patientName?: string | null;
  patientMrn?: string | null;
  doctorName?: string | null;
  serviceName?: string | null;
  lines: TicketLine[];
  subtotal: number;
  tax: number;
  total: number;
  currency?: string;
  notes?: string | null;
  organization: TicketOrganization;
  branch?: TicketBranch | null;
  footer?: string | null;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatMoney(value: number | string | null | undefined, currency = "MXN"): string {
  const amount = Number(value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${currency === "MXN" ? "$" : `${currency} `}${safe.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatAddress(address: unknown): string {
  if (!address) return "";
  if (typeof address === "string") return address;
  if (typeof address !== "object") return "";
  const a = address as Record<string, unknown>;
  const parts = [
    a.street,
    a.colonia,
    a.ciudad ?? a.city,
    a.estado ?? a.state,
    a.cp ?? a.zip,
    a.pais ?? a.country,
  ]
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean);
  return parts.join(", ");
}

function formatDate(value: Date | string, timezone?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleString("es-MX", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toLocaleString("es-MX");
  }
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  POS: "Tarjeta (POS)",
  SPEI: "Transferencia SPEI",
  MERCADO_PAGO: "Mercado Pago",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Pagado",
  PENDING: "Pendiente",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
  CANCELLED: "Cancelado",
  CANCELED: "Cancelado",
};

export function renderTicketHtml(data: TicketData, timezone = "America/Mexico_City"): string {
  const org = data.organization;
  const orgName = org.displayName?.trim() || org.legalName;
  const branchAddress = formatAddress(data.branch?.address);
  const orgAddress = formatAddress(org.fiscalAddress);
  const currency = data.currency ?? "MXN";

  const linesHtml = data.lines
    .map(
      (line) => `
        <tr>
          <td class="qty">${escapeHtml(line.quantity)}</td>
          <td class="desc">
            ${escapeHtml(line.description)}
            ${line.detail ? `<div class="small muted">${escapeHtml(line.detail)}</div>` : ""}
          </td>
          <td class="money">${escapeHtml(formatMoney(line.unitPrice, currency))}</td>
          <td class="money">${escapeHtml(formatMoney(line.total, currency))}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.title)} ${escapeHtml(data.folio)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px 96px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #f3f4f6;
      color: #111827;
      display: flex;
      justify-content: center;
    }
    .ticket {
      width: 320px;
      max-width: 100%;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 18px 16px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }
    .center { text-align: center; }
    .org { font-size: 15px; font-weight: 700; letter-spacing: 0.02em; }
    .muted { color: #6b7280; }
    .small { font-size: 10px; line-height: 1.35; }
    .title { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #9ca3af; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; }
    .folio { font-size: 11px; margin-top: 2px; }
    .meta { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #9ca3af; font-size: 11px; }
    .meta-row { display: flex; justify-content: space-between; gap: 10px; margin: 3px 0; }
    .meta-row span:first-child { color: #6b7280; }
    .meta-row span:last-child { text-align: right; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
    th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 1px solid #d1d5db; padding: 4px 2px; }
    td { padding: 5px 2px; vertical-align: top; border-bottom: 1px dotted #e5e7eb; }
    .qty { width: 28px; text-align: center; }
    .money { text-align: right; white-space: nowrap; width: 72px; }
    .desc { word-break: break-word; }
    .totals { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #9ca3af; font-size: 12px; }
    .totals .row { display: flex; justify-content: space-between; margin: 3px 0; }
    .totals .grand { font-size: 15px; font-weight: 700; margin-top: 6px; padding-top: 6px; border-top: 1px solid #111827; }
    .notes { margin-top: 10px; font-size: 10px; color: #4b5563; }
    .footer { margin-top: 14px; padding-top: 10px; border-top: 1px dashed #9ca3af; font-size: 10px; text-align: center; color: #6b7280; }
    .actions {
      position: fixed; bottom: 0; left: 0; right: 0;
      display: flex; justify-content: center; gap: 10px;
      padding: 12px; background: rgba(255,255,255,0.96); border-top: 1px solid #d1d5db;
    }
    .actions button {
      font: inherit; font-size: 13px; border-radius: 8px; padding: 10px 16px; cursor: pointer;
      border: 1px solid #d1d5db; background: #fff; color: #374151;
    }
    .actions button.primary { background: #0f766e; border-color: #0f766e; color: #fff; font-weight: 600; }
    @media print {
      body { background: #fff; padding: 0; }
      .ticket { border: 0; box-shadow: none; border-radius: 0; width: 100%; padding: 0; }
      .actions { display: none; }
      @page { margin: 6mm; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="center">
      <div class="org">${escapeHtml(orgName)}</div>
      ${org.rfc ? `<div class="small muted">RFC: ${escapeHtml(org.rfc)}</div>` : ""}
      ${orgAddress ? `<div class="small muted">${escapeHtml(orgAddress)}</div>` : ""}
      ${org.phone ? `<div class="small muted">Tel: ${escapeHtml(org.phone)}</div>` : ""}
      <div class="title">${escapeHtml(data.title)}</div>
      <div class="folio">Folio: <strong>${escapeHtml(data.folio)}</strong></div>
    </div>

    <div class="meta">
      <div class="meta-row"><span>Fecha</span><span>${escapeHtml(formatDate(data.date, timezone))}</span></div>
      ${data.branch ? `<div class="meta-row"><span>Sucursal</span><span>${escapeHtml(data.branch.name)}</span></div>` : ""}
      ${branchAddress ? `<div class="meta-row"><span>Dirección</span><span>${escapeHtml(branchAddress)}</span></div>` : ""}
      ${data.patientName ? `<div class="meta-row"><span>Paciente</span><span>${escapeHtml(data.patientName)}</span></div>` : ""}
      ${data.patientMrn ? `<div class="meta-row"><span>Expediente</span><span>${escapeHtml(data.patientMrn)}</span></div>` : ""}
      ${data.doctorName ? `<div class="meta-row"><span>Médico</span><span>${escapeHtml(data.doctorName)}</span></div>` : ""}
      ${data.paymentMethod ? `<div class="meta-row"><span>Método de pago</span><span>${escapeHtml(METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod)}</span></div>` : ""}
      ${data.status ? `<div class="meta-row"><span>Estado</span><span>${escapeHtml(STATUS_LABELS[data.status] ?? data.status)}</span></div>` : ""}
    </div>

    <table>
      <thead>
        <tr>
          <th class="qty">Cant</th>
          <th>Descripción</th>
          <th class="money">P. unit</th>
          <th class="money">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${escapeHtml(formatMoney(data.subtotal, currency))}</span></div>
      <div class="row"><span>IVA</span><span>${escapeHtml(formatMoney(data.tax, currency))}</span></div>
      <div class="row grand"><span>Total</span><span>${escapeHtml(formatMoney(data.total, currency))}</span></div>
    </div>

    ${data.notes ? `<div class="notes"><strong>Notas:</strong> ${escapeHtml(data.notes)}</div>` : ""}

    <div class="footer">
      ${escapeHtml(data.footer ?? "Gracias por su preferencia")}
    </div>
  </div>

  <div class="actions">
    <button type="button" onclick="window.print()" class="primary">Imprimir</button>
    <button type="button" onclick="window.close()">Cerrar</button>
  </div>
  <script>
    if (new URLSearchParams(location.search).get("auto") === "1") {
      window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 250); });
    }
  </script>
</body>
</html>`;
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";

interface Schedule {
  id: string; name: string; reportType: string; cronExpression: string;
  recipients: string[]; format: string; isActive: boolean; lastSentAt: string | null;
  createdAt: string;
}

const REPORT_TYPES = [
  { value: "revenue", label: "Ingresos" },
  { value: "appointments", label: "Citas" },
  { value: "patients", label: "Pacientes" },
  { value: "doctors", label: "Medicos" },
];

const PRESETS = [
  { label: "Cada hora", cron: "0 * * * *" },
  { label: "Diario (medianoche)", cron: "0 0 * * *" },
  { label: "Semanal (lunes)", cron: "0 0 * * 1" },
  { label: "Mensual (dia 1)", cron: "0 0 1 * *" },
];

const CRON_LABEL: Record<string, string> = {
  "0 * * * *": "Cada hora",
  "0 0 * * *": "Diario",
  "0 0 * * 1": "Semanal",
  "0 0 1 * *": "Mensual",
};

export default function ReportSchedulesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [reportType, setReportType] = useState("revenue");
  const [cronExpression, setCronExpression] = useState("0 0 * * *");
  const [recipients, setRecipients] = useState("");
  const [error, setError] = useState("");

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["report-schedules"],
    queryFn: async () => { const { data } = await api.get<Schedule[]>("/report-schedules"); return data; },
  });

  const createMut = useMutation({
    mutationFn: (body: { name: string; reportType: string; cronExpression: string; recipients: string[] }) => api.post("/report-schedules", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report-schedules"] }); setShowForm(false); resetForm(); },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/report-schedules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-schedules"] }),
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const triggerMut = useMutation({
    mutationFn: (id: string) => api.post(`/report-schedules/${id}/trigger`),
    onSuccess: () => setError("Reporte enviado"),
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const resetForm = () => { setName(""); setReportType("revenue"); setCronExpression("0 0 * * *"); setRecipients(""); setError(""); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !recipients) { setError("Completa nombre y destinatarios"); return; }
    const emails = recipients.split(",").map((s) => s.trim()).filter(Boolean);
    if (emails.length === 0) { setError("Ingresa al menos un email"); return; }
    createMut.mutate({ name, reportType, cronExpression, recipients: emails });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Reportes Programados</h2>
        <button onClick={() => { setShowForm(!showForm); resetForm(); }} className="btn-primary text-sm">
          {showForm ? "Cancelar" : "+ Nueva programacion"}
        </button>
      </div>

      {error && <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Ej: Reporte semanal de ingresos" /></div>
            <div><label className="label">Tipo de reporte</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="input">
                {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Frecuencia</label>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map((p) => (
                <button key={p.cron} type="button" onClick={() => setCronExpression(p.cron)}
                  className={`px-3 py-1 text-xs rounded border ${cronExpression === p.cron ? "bg-primary-100 border-primary-300 text-primary-700" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <input value={cronExpression} onChange={(e) => setCronExpression(e.target.value)} className="input mt-2 font-mono text-sm" placeholder="0 0 * * *" />
          </div>
          <div><label className="label">Destinatarios (emails separados por coma)</label>
            <input value={recipients} onChange={(e) => setRecipients(e.target.value)} className="input" placeholder="admin@clinica.mx, medico@clinica.mx" />
          </div>
          <button type="submit" disabled={createMut.isPending} className="btn-primary">{createMut.isPending ? "Guardando..." : "Guardar programacion"}</button>
        </form>
      )}

      {isLoading ? (
        <p className="text-ink-500">Cargando...</p>
      ) : !schedules || schedules.length === 0 ? (
        <div className="card text-center py-8"><p className="text-ink-500 text-sm">No hay reportes programados</p></div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <div key={s.id} className="card flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink-900">{s.name}</span>
                  <span className={`badge ${s.isActive ? "bg-success-100 text-success-700" : "bg-ink-100 text-ink-600"}`}>
                    {s.isActive ? "Activo" : "Inactivo"}
                  </span>
                  <span className="badge bg-primary-100 text-primary-700">{REPORT_TYPES.find((t) => t.value === s.reportType)?.label ?? s.reportType}</span>
                </div>
                <p className="text-xs text-ink-500 mt-1">
                  Frecuencia: {CRON_LABEL[s.cronExpression] ?? s.cronExpression} &middot;
                  Enviar a: {s.recipients.join(", ")}
                </p>
                {s.lastSentAt && <p className="text-xs text-ink-400 mt-1">Ultimo envio: {new Date(s.lastSentAt).toLocaleString("es-MX")}</p>}
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => triggerMut.mutate(s.id)} className="btn-secondary text-xs">Enviar ahora</button>
                <button onClick={() => { if (confirm("Eliminar programacion?")) deleteMut.mutate(s.id); }} className="text-danger-600 text-xs hover:underline">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

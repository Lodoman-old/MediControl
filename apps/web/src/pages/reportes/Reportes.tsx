import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "@/lib/api";

interface RevenueReport {
  from: string; to: string; total: number; count: number;
  groupBy?: string; groups?: Record<string, { count: number; total: number }>;
}
interface AppointmentsReport {
  from: string; to: string; total: number;
  byStatus: Record<string, number>;
}
interface PatientsReport {
  from: string; to: string; totalPatients: number;
  activePatients: number; totalVisits: number; avgVisitsPerPatient: number;
}
interface DoctorReport {
  id: string; name: string; specialty: string;
  appointments: number; completed: number; revenue: number;
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Programadas", CHECKED_IN: "Registradas", IN_CONSULT: "En consulta",
  COMPLETED: "Completadas", CANCELED: "Canceladas", NO_SHOW: "Inasistencias",
  PAID: "Pagadas", PAYMENT_PENDING_VALIDATION: "Pago pendiente", RESCHEDULED: "Reprogramadas",
};

function currency(n: number) { return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2 }); }

export default function ReportesPage() {
  const [tab, setTab] = useState<"revenue" | "appointments" | "patients" | "doctors">("revenue");
  const [from, setFrom] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const rev = useQuery({
    queryKey: ["reports", "revenue", from, to],
    queryFn: async () => { const { data } = await api.get<RevenueReport>(`/reports/revenue?from=${from}&to=${to}`); return data; },
  });
  const apps = useQuery({
    queryKey: ["reports", "appointments", from, to],
    queryFn: async () => { const { data } = await api.get<AppointmentsReport>(`/reports/appointments?from=${from}&to=${to}`); return data; },
  });
  const pats = useQuery({
    queryKey: ["reports", "patients", from, to],
    queryFn: async () => { const { data } = await api.get<PatientsReport>(`/reports/patients?from=${from}&to=${to}`); return data; },
  });
  const docs = useQuery({
    queryKey: ["reports", "doctors", from, to],
    queryFn: async () => { const { data } = await api.get<DoctorReport[]>(`/reports/doctors?from=${from}&to=${to}`); return data; },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Reportes</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink-500">Desde</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input max-w-[160px]" />
          <label className="text-sm text-ink-500">Hasta</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input max-w-[160px]" />
        </div>
      </div>

      <div className="flex gap-2 border-b border-ink-200 pb-2">
        {(["revenue", "appointments", "patients", "doctors"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 text-sm font-medium rounded ${tab === t ? "bg-primary-100 text-primary-700" : "text-ink-500 hover:text-ink-700"}`}>
            {t === "revenue" ? "Ingresos" : t === "appointments" ? "Citas" : t === "patients" ? "Pacientes" : "Medicos"}
          </button>
        ))}
      </div>

      {tab === "revenue" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card"><p className="text-sm text-ink-500">Total ingresos</p><p className="text-3xl font-bold text-success-600">{rev.data ? currency(rev.data.total) : "—"}</p></div>
            <div className="card"><p className="text-sm text-ink-500">Citas pagadas</p><p className="text-3xl font-bold text-ink-900">{rev.data?.count ?? "—"}</p></div>
            <div className="card"><p className="text-sm text-ink-500">Promedio por cita</p><p className="text-3xl font-bold text-ink-900">{rev.data?.count ? currency(rev.data.total / rev.data.count) : "—"}</p></div>
          </div>
          {rev.data?.groups && Object.keys(rev.data.groups).length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="font-semibold text-ink-900 mb-3">Por {rev.data.groupBy === "doctor" ? "medico" : "servicio"}</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-ink-500 text-left"><th className="pb-2 font-medium">Nombre</th><th className="pb-2 font-medium">Citas</th><th className="pb-2 font-medium text-right">Total</th></tr></thead>
                <tbody>{Object.entries(rev.data.groups).map(([key, g]) => (
                  <tr key={key} className="border-t border-ink-100"><td className="py-2 text-ink-900">{key}</td><td className="py-2">{g.count}</td><td className="py-2 text-right font-mono">{currency(g.total)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "appointments" && (
        <div className="space-y-4">
          <div className="card"><p className="text-sm text-ink-500">Total de citas</p><p className="text-3xl font-bold text-ink-900">{apps.data?.total ?? "—"}</p></div>
          {apps.data?.byStatus && (
            <div className="card p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-ink-50 text-ink-600 text-left"><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium text-right">Cantidad</th></tr></thead>
                <tbody>{Object.entries(apps.data.byStatus).map(([status, count]) => (
                  <tr key={status} className="border-t border-ink-100"><td className="px-4 py-3">{STATUS_LABEL[status] ?? status}</td><td className="px-4 py-3 text-right font-semibold">{count}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "patients" && (
        <div className="grid grid-cols-4 gap-4">
          <div className="card"><p className="text-sm text-ink-500">Total pacientes</p><p className="text-3xl font-bold text-ink-900">{pats.data?.totalPatients ?? "—"}</p></div>
          <div className="card"><p className="text-sm text-ink-500">Pacientes activos</p><p className="text-3xl font-bold text-primary-600">{pats.data?.activePatients ?? "—"}</p></div>
          <div className="card"><p className="text-sm text-ink-500">Visitas totales</p><p className="text-3xl font-bold text-ink-900">{pats.data?.totalVisits ?? "—"}</p></div>
          <div className="card"><p className="text-sm text-ink-500">Prom. visitas/paciente</p><p className="text-3xl font-bold text-ink-900">{pats.data?.avgVisitsPerPatient ?? "—"}</p></div>
        </div>
      )}

      {tab === "doctors" && (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-ink-50 text-ink-600 text-left">
              <th className="px-4 py-3 font-medium">Medico</th><th className="px-4 py-3 font-medium">Especialidad</th>
              <th className="px-4 py-3 font-medium text-right">Citas</th><th className="px-4 py-3 font-medium text-right">Completadas</th>
              <th className="px-4 py-3 font-medium text-right">Ingresos</th>
            </tr></thead>
            <tbody>{(docs.data ?? []).map(d => (
              <tr key={d.id} className="border-t border-ink-100 hover:bg-ink-50">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3 text-ink-600">{d.specialty}</td>
                <td className="px-4 py-3 text-right">{d.appointments}</td>
                <td className="px-4 py-3 text-right text-success-600">{d.completed}</td>
                <td className="px-4 py-3 text-right font-mono">{currency(d.revenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

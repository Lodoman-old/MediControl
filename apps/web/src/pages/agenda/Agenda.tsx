import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { appointmentStatusLabel } from "@/lib/roles";

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  reason: string | null;
  channel: string;
  priceQuoted: number;
  currency: string;
  doctorName: string | null;
  patientName: string | null;
  serviceName: string | null;
  locationName: string | null;
  branchName: string | null;
  createdAt: string;
}

interface DaySummary {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  appointments: Appointment[];
}

async function fetchDaySummary(date: string): Promise<DaySummary> {
  const { data } = await api.get<DaySummary>(`/appointments/day/${date}`);
  return data;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING_DOCTOR_CONFIRMATION: "bg-yellow-100 text-yellow-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PAYMENT_PENDING_VALIDATION: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  CHECKED_IN: "bg-purple-100 text-purple-700",
  IN_TRIAGE: "bg-teal-100 text-teal-700",
  IN_CONSULT: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

export default function AgendaPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading, error } = useQuery({
    queryKey: ["appointments", "day", date],
    queryFn: () => fetchDaySummary(date),
  });

  const canCreate = user?.roles.includes("ADMIN") || user?.roles.includes("RECEPTION") || user?.roles.includes("SUPERADMIN");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-ink-900">Agenda del dia</h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input max-w-[200px]"
          />
        </div>
        {canCreate && (
          <button
            onClick={() => navigate("/appointments/new")}
            className="btn-primary text-sm w-full sm:w-auto"
          >
            Nueva cita
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">
            {error instanceof Error ? error.message : "Error al cargar agenda"}
          </p>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-ink-900">{data.total}</p>
          </div>
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Pendientes</p>
            <p className="text-xl sm:text-2xl font-bold text-warning-600">{data.pending}</p>
          </div>
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Atendidas</p>
            <p className="text-xl sm:text-2xl font-bold text-success-600">{data.completed}</p>
          </div>
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Canceladas</p>
            <p className="text-xl sm:text-2xl font-bold text-danger-600">{data.cancelled}</p>
          </div>
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Inasistencias</p>
            <p className="text-xl sm:text-2xl font-bold text-orange-600">{data.noShow}</p>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-ink-600 text-left">
              <th className="px-4 py-3 font-medium">Hora</th>
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Medico</th>
              <th className="px-4 py-3 font-medium">Servicio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Ubicacion</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  Cargando agenda...
                </td>
              </tr>
            ) : !data || data.appointments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  No hay citas para esta fecha
                </td>
              </tr>
            ) : (
              data.appointments.map((a) => (
                <tr key={a.id} className="border-t border-ink-100 hover:bg-ink-50">
                  <td className="px-4 py-3 font-mono text-sm text-ink-900">
                    {format(parseISO(a.startsAt), "HH:mm")} - {format(parseISO(a.endsAt), "HH:mm")}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-900">{a.patientName ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-600">{a.doctorName ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-600">{a.serviceName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGE[a.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {appointmentStatusLabel(a.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{a.locationName ?? a.branchName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/appointments/${a.id}`)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

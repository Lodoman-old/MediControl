import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/stores/authStore";
import { roleLabels } from "@/lib/roles";

interface DashboardStats {
  appointmentsToday: number;
  pendingPayments: number;
  totalPatients: number;
  completedToday: number;
  revenueToday: number;
  upcomingAppointments: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    patient: string;
    doctor: string;
    service: string;
    priceQuoted: number;
  }[];
}

async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

async function fetchStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/dashboard/stats");
  return data;
}

function formatCurrency(n: number): string {
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2 });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const accessToken = useAuthStore((s) => s.accessToken);

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    enabled: Boolean(accessToken),
    retry: false,
    staleTime: 60_000,
  });

  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchStats,
    enabled: Boolean(accessToken),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (meQuery.isError) {
      useAuthStore.getState().clear();
      navigate("/login", { replace: true });
    }
  }, [meQuery.isError, navigate]);

  const stats = statsQuery.data;

  return (
    <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-ink-900">
          Bienvenido a MediControl
        </h1>
        <p className="text-sm sm:text-base text-ink-500 mt-1">
          Aqui veras tu agenda del dia, pagos por validar y accesos rapidos al
          expediente.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-8">
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Citas hoy</p>
            <p className="text-xl sm:text-3xl font-bold text-ink-900 mt-1">
              {stats?.appointmentsToday ?? "—"}
            </p>
            <p className="text-xs text-ink-400 mt-1">
              {stats?.completedToday ?? 0} completadas
            </p>
          </div>
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Pagos por validar</p>
            <p className="text-xl sm:text-3xl font-bold text-warning-600 mt-1">
              {stats?.pendingPayments ?? "—"}
            </p>
          </div>
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Pacientes activos</p>
            <p className="text-xl sm:text-3xl font-bold text-primary-600 mt-1">
              {stats?.totalPatients ?? "—"}
            </p>
          </div>
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Ingresos hoy</p>
            <p className="text-xl sm:text-3xl font-bold text-success-600 mt-1">
              {stats ? formatCurrency(stats.revenueToday) : "—"}
            </p>
          </div>
        </div>

        {stats && stats.upcomingAppointments.length > 0 && (
          <div className="card p-4 sm:p-6 mt-4 sm:mt-6">
            <h2 className="text-base sm:text-lg font-semibold text-ink-900">
              Proximas citas
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-ink-500">
                    <th className="text-left pb-2 font-medium">Hora</th>
                    <th className="text-left pb-2 font-medium">Paciente</th>
                    <th className="text-left pb-2 font-medium">Doctor</th>
                    <th className="text-left pb-2 font-medium">Servicio</th>
                    <th className="text-right pb-2 font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.upcomingAppointments.map((a) => (
                    <tr key={a.id} className="border-b border-ink-50">
                      <td className="py-2 text-ink-900">{formatTime(a.startsAt)}</td>
                      <td className="py-2 text-ink-900">{a.patient}</td>
                      <td className="py-2 text-ink-900">{a.doctor}</td>
                      <td className="py-2 text-ink-600">{a.service}</td>
                      <td className="py-2 text-right text-ink-900">
                        {formatCurrency(a.priceQuoted)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {user && (
          <div className="card mt-6">
            <h2 className="text-lg font-semibold text-ink-900">
              Tu sesion (debug S1)
            </h2>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-ink-500">Email</dt>
                <dd className="text-ink-900 font-mono">{user.email}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Organizacion</dt>
                <dd className="text-ink-900 font-mono text-xs">
                  {user.organizationId}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Sucursal</dt>
                <dd className="text-ink-900 font-mono text-xs">
                  {user.branchId ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Roles</dt>
                <dd className="text-ink-900">{roleLabels(user.roles)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-500">Permisos ({user.permissions.length})</dt>
                <dd className="text-ink-900 text-xs font-mono break-words">
                  {user.permissions.join(", ")}
                </dd>
              </div>
            </dl>
          </div>
        )}
    </div>
  );
}

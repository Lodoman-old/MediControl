import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { methodLabel, statusLabel } from "@/lib/roles";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  patient?: {
    person?: { fullName?: string };
  };
}

interface DailySummary {
  total: number;
  count: number;
  byMethod: Record<string, number>;
}

async function fetchPayments(): Promise<Payment[]> {
  const { data } = await api.get<Payment[]>("/payments");
  return data;
}

async function fetchDailySummary(date: string): Promise<DailySummary> {
  const { data } = await api.get<DailySummary>(`/payments/summary/daily?date=${date}`);
  return data;
}

const METHOD_BADGE: Record<string, string> = {
  CASH: "bg-green-100 text-green-700",
  POS: "bg-blue-100 text-blue-700",
  SPEI: "bg-purple-100 text-purple-700",
  MERCADO_PAGO: "bg-yellow-100 text-yellow-700",
  TRANSFER: "bg-cyan-100 text-cyan-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

export default function PagosPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: payments, isLoading, error } = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
  });

  const { data: summary } = useQuery({
    queryKey: ["payments", "summary", date],
    queryFn: () => fetchDailySummary(date),
  });

  const canCreate = user?.roles.includes("ADMIN") || user?.roles.includes("DOCTOR") || user?.roles.includes("SUPERADMIN");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-ink-900">Pagos</h2>
        {canCreate && (
          <button onClick={() => navigate("/pagos/nuevo")} className="btn-primary text-sm w-full sm:w-auto">
            Nuevo pago
          </button>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Total del dia</p>
            <p className="text-xl sm:text-2xl font-bold text-ink-900">
              ${Number(summary.total).toLocaleString("es-MX")}
            </p>
          </div>
          <div className="card p-3 sm:p-6">
            <p className="text-xs sm:text-sm text-ink-500">Transacciones</p>
            <p className="text-xl sm:text-2xl font-bold text-ink-900">{summary.count}</p>
          </div>
          {Object.entries(summary.byMethod).slice(0, 2).map(([method, amount]) => (
            <div key={method} className="card p-3 sm:p-6">
              <p className="text-xs sm:text-sm text-ink-500">{methodLabel(method)}</p>
              <p className="text-xl sm:text-2xl font-bold text-ink-900">
                ${Number(amount).toLocaleString("es-MX")}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-ink-500">Fecha:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input max-w-[200px]"
        />
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">
            {error instanceof Error ? error.message : "Error al cargar pagos"}
          </p>
        </div>
      )}

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-ink-600 text-left">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Metodo</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Referencia</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  Cargando pagos...
                </td>
              </tr>
            ) : !payments || payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  No hay pagos registrados
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-t border-ink-100 hover:bg-ink-50">
                  <td className="px-4 py-3 text-ink-900">
                    {format(parseISO(p.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    {p.patient?.person?.fullName ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-900">
                    ${Number(p.amount).toLocaleString("es-MX")} {p.currency}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${METHOD_BADGE[p.method] ?? "bg-gray-100 text-gray-700"}`}>
                      {methodLabel(p.method)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGE[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {statusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600 font-mono text-xs">{p.reference ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/pagos/${p.id}`)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      Detalle
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

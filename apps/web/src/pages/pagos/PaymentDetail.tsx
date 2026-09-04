import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { api, extractErrorMessage } from "@/lib/api";
import { methodLabel, statusLabel } from "@/lib/roles";
import { useState } from "react";

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
    id: string;
    mrn: string;
    person?: { fullName?: string; phone?: string; email?: string };
  };
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

const STATUS_OPTIONS = [
  { value: "COMPLETED", label: "Completado" },
  { value: "FAILED", label: "Fallido" },
  { value: "REFUNDED", label: "Reembolsado" },
  { value: "CANCELLED", label: "Cancelado" },
];

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const { data: payment, isLoading, error } = useQuery({
    queryKey: ["payments", id],
    queryFn: async () => {
      const { data } = await api.get<Payment>(`/payments/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      await api.patch(`/payments/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", id] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setNewStatus("");
      setUpdatingStatus(false);
    },
    onError: (err) => {
      setStatusError(extractErrorMessage(err));
      setUpdatingStatus(false);
    },
  });

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    setUpdatingStatus(true);
    setStatusError(null);
    statusMutation.mutate(newStatus);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <p className="text-ink-500">Cargando pago...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">
            {error ? extractErrorMessage(error) : "Pago no encontrado"}
          </p>
        </div>
        <button onClick={() => navigate("/pagos")} className="btn-secondary text-sm">
          Volver a pagos
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate("/pagos")} className="text-sm text-primary-600 hover:text-primary-800">
          &larr; Volver a pagos
        </button>
        <h2 className="text-2xl font-semibold text-ink-900 mt-1">Detalle de pago</h2>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-500">Estado</p>
            <span className={`badge ${STATUS_BADGE[payment.status] ?? "bg-gray-100 text-gray-700"}`}>
              {statusLabel(payment.status)}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-ink-500">Monto</p>
            <p className="text-2xl font-bold text-ink-900">
              ${Number(payment.amount).toLocaleString("es-MX")} {payment.currency}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-ink-500">Metodo de pago</p>
            <span className={`badge ${METHOD_BADGE[payment.method] ?? "bg-gray-100 text-gray-700"}`}>
              {methodLabel(payment.method)}
            </span>
          </div>
          <div>
            <p className="text-sm text-ink-500">Referencia</p>
            <p className="text-sm text-ink-900 font-mono">{payment.reference ?? "Sin referencia"}</p>
          </div>
          <div>
            <p className="text-sm text-ink-500">Fecha de creacion</p>
            <p className="text-sm text-ink-900">
              {format(parseISO(payment.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
            </p>
          </div>
          {payment.paidAt && (
            <div>
              <p className="text-sm text-ink-500">Fecha de pago</p>
              <p className="text-sm text-ink-900">
                {format(parseISO(payment.paidAt), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
            </div>
          )}
        </div>

        {payment.patient && (
          <div className="border-t border-ink-100 pt-4">
            <p className="text-sm text-ink-500 mb-2">Paciente</p>
            <p className="text-sm font-medium text-ink-900">{payment.patient.person?.fullName ?? "—"}</p>
            {payment.patient.mrn && (
              <p className="text-xs text-ink-500 mt-1">NHC: {payment.patient.mrn}</p>
            )}
            {payment.patient.person?.phone && (
              <p className="text-xs text-ink-500">Tel: {payment.patient.person.phone}</p>
            )}
            {payment.patient.person?.email && (
              <p className="text-xs text-ink-500">Email: {payment.patient.person.email}</p>
            )}
          </div>
        )}

        {payment.notes && (
          <div className="border-t border-ink-100 pt-4">
            <p className="text-sm text-ink-500 mb-1">Notas</p>
            <p className="text-sm text-ink-900">{payment.notes}</p>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-ink-900">Actualizar estado</h3>
        {statusError && (
          <div className="p-2 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-xs text-danger-700">{statusError}</p>
          </div>
        )}
        <div className="flex gap-2">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="input flex-1"
          >
            <option value="">Seleccionar estado...</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={handleStatusUpdate}
            disabled={!newStatus || updatingStatus}
            className="btn-primary text-sm"
          >
            {updatingStatus ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>
    </div>
  );
}

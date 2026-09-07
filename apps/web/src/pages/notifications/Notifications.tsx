import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";
import { format } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => api.get(`/notifications?page=${page}&limit=20`).then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications: Notification[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleNotificationClick = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.referenceType === "Prescription" && n.referenceId) {
      navigate(`/farmacia/pos?prescriptionId=${n.referenceId}`);
    } else if (n.referenceType === "Appointment" && n.referenceId) {
      navigate(`/appointments/${n.referenceId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Notificaciones</h2>
        <div className="flex items-center gap-3">
          {notifications.some((n) => !n.readAt) && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Marcar todo como leido
            </button>
          )}
          <button onClick={() => navigate(-1)} className="text-sm text-ink-500 hover:text-ink-700">
            Volver
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
          {extractErrorMessage(error)}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-ink-500">Cargando...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-ink-500">Sin notificaciones</div>
      ) : (
        <div className="card p-0 divide-y divide-ink-100">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`w-full text-left px-4 py-3 hover:bg-ink-50 transition-colors ${
                !n.readAt ? "bg-primary-50/30" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {!n.readAt && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.readAt ? "font-semibold text-ink-900" : "text-ink-700"}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-ink-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-ink-400 mt-1">
                    {format(new Date(n.createdAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm"
          >
            Anterior
          </button>
          <span className="text-sm text-ink-500 py-1">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary text-sm"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

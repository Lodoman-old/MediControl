import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";
import { format } from "date-fns";

interface CashRegister {
  id: string;
  branchId: string;
  openedAt: string;
  closedAt: string | null;
  initialAmount: number;
  expectedAmount: number | null;
  actualAmount: number | null;
  difference: number | null;
  status: "OPEN" | "CLOSED";
  notes: string | null;
  openedBy: { id: string; email: string; person?: { firstName: string; lastNameP: string } };
  closedBy?: { id: string; email: string; person?: { firstName: string; lastNameP: string } };
  movements: Array<{ id: string; type: string; amount: number; reason: string | null; createdAt: string }>;
}

export default function CashRegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [closeAmount, setCloseAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState<"active" | "history">("active");

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get("/admin/branches").then(r => r.data?.data ?? r.data ?? []),
  });

  const { data: activeRegister, refetch: refetchActive } = useQuery({
    queryKey: ["cash-register", "active"],
    queryFn: () => api.get<CashRegister>("/cash-register/active").then(r => r.data),
  });

  const { data: history } = useQuery({
    queryKey: ["cash-register", "history"],
    queryFn: () => api.get<CashRegister[]>("/cash-register/history").then(r => r.data),
    enabled: tab === "history",
  });

  const openMutation = useMutation({
    mutationFn: (body: { branchId: string; initialAmount: number; notes?: string }) =>
      api.post("/cash-register/open", body),
    onSuccess: () => {
      refetchActive();
      setSuccess("Caja abierta exitosamente");
      setInitialAmount("");
      setNotes("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const closeMutation = useMutation({
    mutationFn: (body: { actualAmount: number; notes?: string }) =>
      api.patch(`/cash-register/${activeRegister?.id}/close`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-register"] });
      setSuccess("Caja cerrada exitosamente");
      setCloseAmount("");
      setNotes("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!branches?.length) { setError("No hay sucursales disponibles"); return; }
    openMutation.mutate({
      branchId: branches[0].id,
      initialAmount: parseFloat(initialAmount) || 0,
      notes: notes || undefined,
    });
  };

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!closeAmount) { setError("Ingresa el monto final"); return; }
    closeMutation.mutate({ actualAmount: parseFloat(closeAmount), notes: notes || undefined });
  };

  const diff = activeRegister?.difference;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Control de caja</h2>
        <button onClick={() => navigate("/farmacia")} className="text-sm text-ink-500 hover:text-ink-700">Volver</button>
      </div>

      <div className="flex gap-2 border-b border-ink-200 pb-2">
        <button onClick={() => setTab("active")}
          className={`px-3 py-1 text-sm font-medium rounded ${tab === "active" ? "bg-primary-100 text-primary-700" : "text-ink-500"}`}>
          Caja actual
        </button>
        <button onClick={() => setTab("history")}
          className={`px-3 py-1 text-sm font-medium rounded ${tab === "history" ? "bg-primary-100 text-primary-700" : "text-ink-500"}`}>
          Historico de cortes
        </button>
      </div>

      {error && <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">{error}</div>}
      {success && <div className="p-3 bg-success-50 border border-success-200 rounded-lg text-sm text-success-700">{success}</div>}

      {tab === "active" && (
        <>
          {!activeRegister ? (
            <form onSubmit={handleOpen} className="card space-y-4 max-w-md">
              <h3 className="text-lg font-semibold text-ink-900">Abrir caja</h3>
              <p className="text-sm text-ink-500">Sucursal: {branches?.[0]?.name ?? "Consultorio Principal"}</p>
              <div>
                <label className="label">Monto inicial (opcional)</label>
                <input type="number" step="0.01" className="input" value={initialAmount}
                  onChange={e => setInitialAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Nota (opcional)</label>
                <input className="input" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Ej: Apertura turno matutino" />
              </div>
              <button type="submit" disabled={openMutation.isPending} className="btn-primary">
                {openMutation.isPending ? "Abriendo..." : "Abrir caja"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-green-700">Caja abierta</h3>
                  <span className="badge bg-green-100 text-green-700 text-xs">
                    Abierta desde {format(new Date(activeRegister.openedAt), "HH:mm")}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-ink-500">Abrio</dt>
                    <dd className="font-medium">
                      {activeRegister.openedBy?.person
                        ? `${activeRegister.openedBy.person.firstName} ${activeRegister.openedBy.person.lastNameP}`
                        : activeRegister.openedBy?.email}
                    </dd></div>
                  <div><dt className="text-ink-500">Monto inicial</dt>
                    <dd className="font-mono font-semibold">${Number(activeRegister.initialAmount).toFixed(2)}</dd></div>
                  <div><dt className="text-ink-500">Ingresos estimados</dt>
                    <dd className="font-mono font-semibold">
                      {activeRegister.expectedAmount != null
                        ? `$${Number(activeRegister.expectedAmount).toFixed(2)}`
                        : "Aun sin corte"}
                    </dd></div>
                  <div><dt className="text-ink-500">Notas</dt>
                    <dd className="text-ink-600">{activeRegister.notes ?? "—"}</dd></div>
                </dl>
              </div>

              {activeRegister.movements?.length > 0 && (
                <div className="card">
                  <h4 className="text-sm font-semibold text-ink-700 mb-2">Movimientos</h4>
                  <table className="w-full text-sm">
                    <thead><tr className="text-ink-500 text-left">
                      <th className="pb-1 font-medium">Tipo</th>
                      <th className="pb-1 font-medium">Monto</th>
                      <th className="pb-1 font-medium">Motivo</th>
                      <th className="pb-1 font-medium">Hora</th>
                    </tr></thead>
                    <tbody>{activeRegister.movements.map((m: any) => (
                      <tr key={m.id} className="border-t border-ink-100">
                        <td className="py-1"><span className={`badge ${m.type === "IN" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{m.type === "IN" ? "Entrada" : "Salida"}</span></td>
                        <td className="py-1 font-mono">${Number(m.amount).toFixed(2)}</td>
                        <td className="py-1 text-ink-600">{m.reason ?? "—"}</td>
                        <td className="py-1 text-ink-500 text-xs">{format(new Date(m.createdAt), "HH:mm")}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              <form onSubmit={handleClose} className="card space-y-4 max-w-md">
                <h4 className="text-sm font-semibold text-ink-700">Cerrar caja y hacer corte</h4>
                <div>
                  <label className="label">Monto final en caja</label>
                  <input type="number" step="0.01" className="input text-lg font-mono" value={closeAmount}
                    onChange={e => setCloseAmount(e.target.value)} placeholder="0.00" required />
                </div>
                <div>
                  <label className="label">Nota (opcional)</label>
                  <input className="input" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Ej: Corte turno matutino" />
                </div>
                <button type="submit" disabled={closeMutation.isPending} className="btn-primary">
                  {closeMutation.isPending ? "Cerrando..." : "Cerrar caja y generar corte"}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-ink-50 text-ink-600 text-left">
              <th className="px-4 py-3 font-medium">Apertura</th>
              <th className="px-4 py-3 font-medium">Cierre</th>
              <th className="px-4 py-3 font-medium">Abrio</th>
              <th className="px-4 py-3 font-medium">Inicial</th>
              <th className="px-4 py-3 font-medium">Esperado</th>
              <th className="px-4 py-3 font-medium">Real</th>
              <th className="px-4 py-3 font-medium">Diferencia</th>
            </tr></thead>
            <tbody>{!history?.length ? <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-500">Sin cortes</td></tr>
              : history.map(r => (
                <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50">
                  <td className="px-4 py-3">{format(new Date(r.openedAt), "dd/MM/yyyy HH:mm")}</td>
                  <td className="px-4 py-3">{r.closedAt ? format(new Date(r.closedAt), "dd/MM/yyyy HH:mm") : "—"}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {r.openedBy?.person
                      ? `${r.openedBy.person.firstName} ${r.openedBy.person.lastNameP}`
                      : r.openedBy?.email}
                  </td>
                  <td className="px-4 py-3 font-mono">${Number(r.initialAmount).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono">
                    {r.expectedAmount != null ? `$${Number(r.expectedAmount).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {r.actualAmount != null ? `$${Number(r.actualAmount).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.difference != null ? (
                      <span className={`font-mono font-semibold ${Number(r.difference) >= 0 ? "text-success-600" : "text-danger-600"}`}>
                        ${Number(r.difference).toFixed(2)}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

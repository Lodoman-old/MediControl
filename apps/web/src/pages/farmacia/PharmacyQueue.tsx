import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, extractErrorMessage } from "@/lib/api";
import { format } from "date-fns";

interface QueueItem {
  id: string;
  medication: string;
  medicationId: string | null;
  medicationRef: { name: string; sku: string; requiresPrescription: boolean } | null;
  dosage: string;
  frequency: string;
  quantity: number | null;
  status: string;
  prescribedAt: string;
  totalDispensed: number;
  remaining: number | null;
  isFullyDispensed: boolean;
  patient: { id: string; person: { firstName: string; lastNameP: string; lastNameM?: string } };
  doctor: { person: { firstName: string; lastNameP: string } };
}

async function fetchQueue(branchId?: string): Promise<QueueItem[]> {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  const { data } = await api.get<QueueItem[]>("/pharmacy/queue", { params });
  return data;
}

export default function PharmacyQueuePage() {
  const navigate = useNavigate();
  const [branchFilter, setBranchFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: queue, isLoading, error } = useQuery({
    queryKey: ["pharmacy", "queue", branchFilter],
    queryFn: () => fetchQueue(branchFilter || undefined),
    refetchInterval: 30000,
  });

  const filtered = (queue ?? []).filter((rx) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      rx.patient.person.firstName.toLowerCase().includes(s) ||
      rx.patient.person.lastNameP.toLowerCase().includes(s) ||
      rx.medication.toLowerCase().includes(s) ||
      (rx.medicationRef?.name.toLowerCase().includes(s) ?? false)
    );
  });

  const pending = filtered.filter((rx) => !rx.isFullyDispensed);
  const completed = filtered.filter((rx) => rx.isFullyDispensed);

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-semibold text-ink-900">Cola de farmacia</h2>
        <button onClick={() => navigate("/farmacia")} className="text-sm text-ink-500 hover:text-ink-700">Volver</button>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
          {extractErrorMessage(error)}
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="Buscar por paciente o medicamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="text"
            className="input sm:w-48"
            placeholder="Sucursal ID..."
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          />
        </div>

        <div className="flex gap-4 text-sm">
          <span className="text-ink-500">
            Pendientes: <span className="font-bold text-warning-700">{pending.length}</span>
          </span>
          <span className="text-ink-500">
            Despachadas: <span className="font-bold text-success-700">{completed.length}</span>
          </span>
          <span className="text-ink-500">
            Total: <span className="font-bold">{filtered.length}</span>
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-ink-500">Cargando cola...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-ink-500">Sin recetas pendientes</div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="card p-0 overflow-x-auto">
              <h3 className="px-4 pt-4 pb-2 text-sm font-semibold text-warning-700">Pendientes de despacho</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 text-ink-600 text-left">
                    <th className="px-4 py-2 font-medium">Paciente</th>
                    <th className="px-4 py-2 font-medium">Medicamento</th>
                    <th className="px-4 py-2 font-medium">Dosis</th>
                    <th className="px-4 py-2 font-medium">Cant</th>
                    <th className="px-4 py-2 font-medium">Despacho</th>
                    <th className="px-4 py-2 font-medium">Medico</th>
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((rx) => (
                    <tr key={rx.id} className="border-t border-ink-100 hover:bg-ink-50">
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {rx.patient.person.firstName} {rx.patient.person.lastNameP}
                      </td>
                      <td className="px-4 py-3 text-ink-700">
                        {rx.medicationRef?.name ?? rx.medication}
                        {rx.medicationRef?.requiresPrescription && (
                          <span className="ml-1 badge bg-yellow-100 text-yellow-700 text-xs">Rx</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{rx.dosage}</td>
                      <td className="px-4 py-3 font-mono">{rx.quantity ?? "N/A"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono">
                          {rx.totalDispensed}/{rx.quantity ?? "?"}
                        </span>
                        {rx.remaining !== null && rx.remaining > 0 && (
                          <span className="ml-1 text-xs text-warning-600">(faltan {rx.remaining})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-600 text-xs">
                        Dr. {rx.doctor.person.firstName} {rx.doctor.person.lastNameP}
                      </td>
                      <td className="px-4 py-3 text-ink-500 text-xs">
                        {format(new Date(rx.prescribedAt), "dd/MM HH:mm")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/farmacia/pos?prescriptionId=${rx.id}`)}
                          className="text-xs font-medium text-primary-600 hover:text-primary-800"
                        >
                          Despachar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {completed.length > 0 && (
            <details className="card">
              <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-success-700">
                Despachadas recientemente ({completed.length})
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ink-50 text-ink-600 text-left">
                      <th className="px-4 py-2 font-medium">Paciente</th>
                      <th className="px-4 py-2 font-medium">Medicamento</th>
                      <th className="px-4 py-2 font-medium">Cant</th>
                      <th className="px-4 py-2 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completed.map((rx) => (
                      <tr key={rx.id} className="border-t border-ink-100">
                        <td className="px-4 py-2 text-ink-700">
                          {rx.patient.person.firstName} {rx.patient.person.lastNameP}
                        </td>
                        <td className="px-4 py-2 text-ink-600">{rx.medicationRef?.name ?? rx.medication}</td>
                        <td className="px-4 py-2 font-mono">{rx.quantity ?? "N/A"}</td>
                        <td className="px-4 py-2 text-ink-500 text-xs">
                          {format(new Date(rx.prescribedAt), "dd/MM HH:mm")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

interface PatientListItem {
  id: string;
  mrn: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  bloodType: string | null;
}

interface PatientListResponse {
  data: PatientListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PatientListPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    api.get<PatientListResponse>(`/patients?${params}`)
      .then(({ data }) => {
        setPatients(data.data);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-ink-900">Expediente Clinico</h2>
      <p className="text-ink-500 text-sm">Selecciona un paciente para ver su expediente</p>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="card">
        <input
          className="input max-w-md"
          placeholder="Buscar por nombre o expediente..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-ink-500 text-left">
              <th className="px-4 py-3 font-medium">Expediente</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium">Tipo Sangre</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                  Cargando...
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                  No se encontraron pacientes
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="border-b border-ink-50 hover:bg-ink-50">
                  <td className="px-4 py-3 font-mono text-xs text-ink-600">{p.mrn}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{p.fullName}</td>
                  <td className="px-4 py-3 text-ink-600">{p.email ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-600">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3">{p.bloodType ? <span className="badge">{p.bloodType}</span> : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/expediente/${p.id}`)}
                      className="btn-primary text-xs"
                    >
                      Ver expediente
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-100">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-ink-500">
              Pagina {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { roleLabel } from "@/lib/roles";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  status: string;
  mustChangePassword: boolean;
  branchName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UserListResponse {
  data: User[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

async function fetchUsers(params: string): Promise<UserListResponse> {
  const { data } = await api.get<UserListResponse>(`/admin/users${params}`);
  return data;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  INVITED: "Invitado",
  LOCKED: "Bloqueado",
  DISABLED: "Deshabilitado",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export default function UsersListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const isAdmin = user?.roles.includes("ADMIN") || user?.roles.includes("SUPERADMIN");

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", params.toString()],
    queryFn: () => fetchUsers(`?${params.toString()}`),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="card">
        <p className="text-danger-600">No tienes permisos para ver esta pagina.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-ink-900">Usuarios</h2>
        <button
          onClick={() => navigate("/admin/users/new")}
          className="btn-primary text-sm w-full sm:w-auto"
        >
          Nuevo usuario
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          className="input w-full sm:max-w-sm"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{extractErrorMessage(error)}</p>
        </div>
      )}

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-ink-600 text-left">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Roles</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Sucursal</th>
              <th className="px-4 py-3 font-medium">Ultimo acceso</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  Cargando...
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-500">
                  Ningun usuario encontrado
                </td>
              </tr>
            ) : (
              data?.data.map((u) => (
                <tr key={u.id} className="border-t border-ink-100 hover:bg-ink-50">
                  <td className="px-4 py-3 font-medium text-ink-900">{u.fullName}</td>
                  <td className="px-4 py-3 text-ink-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.map((r) => (
                        <span key={r} className="badge">{roleLabel(r)}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.status === "ACTIVE" ? "bg-success-100 text-success-700" : "bg-warning-100 text-warning-700"}`}>
                      {statusLabel(u.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{u.branchName ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/admin/users/${u.id}`)}
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

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-ink-500">
            Pagina {data.page} de {data.totalPages} ({data.total} usuarios)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.totalPages}
              className="btn-secondary"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

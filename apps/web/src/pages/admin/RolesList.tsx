import { useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { roleLabel } from "@/lib/roles";

interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description?: string;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: Permission[];
  userCount: number;
}

interface RoleListResponse {
  data: Role[];
}

async function fetchRoles(): Promise<RoleListResponse> {
  const { data } = await api.get<RoleListResponse>("/roles");
  return data;
}

const RESOURCE_LABELS: Record<string, string> = {
  users: "Usuarios",
  roles: "Roles",
  org: "Organizacion",
  branches: "Sucursales",
  patients: "Pacientes",
  appointments: "Citas",
  schedule: "Horarios",
  clinical: "Expediente",
  portal: "Portal",
  pharmacy: "Farmacia",
};

function resourceLabel(r: string): string {
  return RESOURCE_LABELS[r] ?? r;
}

export default function RolesListPage() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const groupedPermissions = (perms: Permission[]) => {
    const groups: Record<string, Permission[]> = {};
    for (const p of perms) {
      if (!groups[p.resource]) groups[p.resource] = [];
      groups[p.resource].push(p);
    }
    return groups;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Roles y Permisos</h2>
        <button
          onClick={() => navigate("/admin/roles/new")}
          className="btn-primary"
        >
          Nuevo rol
        </button>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{extractErrorMessage(error)}</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-ink-500">Cargando roles...</p>
      ) : (
        <div className="grid gap-6">
          {data?.data.map((role) => (
            <div key={role.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-ink-900">{role.name}</h3>
                  <p className="text-sm text-ink-500">
                    {roleLabel(role.code)} &middot; {role.userCount} usuario(s)
                    {role.isSystem && " · Sistema"}
                  </p>
                  {role.description && (
                    <p className="text-sm text-ink-600 mt-1">{role.description}</p>
                  )}
                </div>
                {!role.isSystem && (
                  <button
                    onClick={() => navigate(`/admin/roles/${role.id}`)}
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    Editar
                  </button>
                )}
              </div>

              {role.permissions.length > 0 && (
                <div className="space-y-2">
                  {Object.entries(groupedPermissions(role.permissions)).map(([resource, perms]) => (
                    <div key={resource}>
                      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1">
                        {resourceLabel(resource)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {perms.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200"
                            title={p.description}
                          >
                            {p.action}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

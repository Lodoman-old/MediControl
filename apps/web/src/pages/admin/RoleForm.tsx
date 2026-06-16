import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

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
}

const RESOURCE_LABELS: Record<string, string> = {
  users: "Usuarios",
  roles: "Roles",
  org: "Organizacion",
  branches: "Sucursales",
  patients: "Pacientes",
  appointments: "Citas",
  schedule: "Horarios",
  clinical: "Expediente clinico",
  portal: "Portal del paciente",
  pharmacy: "Farmacia / POS",
};

function resourceLabel(r: string): string {
  return RESOURCE_LABELS[r] ?? r;
}

export default function RoleFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id) && id !== "new";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/roles");
        const allRoles: Role[] = (data as any).data ?? [];
        if (isEdit && id) {
          const role = allRoles.find((r) => r.id === id);
          if (role) {
            setCode(role.code);
            setName(role.name);
            setDescription(role.description ?? "");
            setSelectedCodes(role.permissions.map((p) => p.code));
          }
        }
        const allCodes: Permission[] = [];
        const seen = new Set<string>();
        for (const r of allRoles) {
          for (const p of r.permissions) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              allCodes.push(p);
            }
          }
        }
        setAllPermissions(allCodes);
      } catch (err) {
        setError(extractErrorMessage(err));
      }
    })();
  }, [isEdit, id]);

  const togglePermission = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const grouped = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = { name, description, permissionCodes: selectedCodes };
      if (isEdit) {
        await api.patch(`/roles/${id}`, body);
      } else {
        body.code = code;
        await api.post("/roles", body);
      }
      navigate("/admin/roles");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">
          {isEdit ? "Editar rol" : "Nuevo rol"}
        </h2>
        <button onClick={() => navigate("/admin/roles")} className="btn-secondary">
          Volver
        </button>
      </div>

      <div className="card">
        {error && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        {!isEdit && (
          <div className="mb-4 p-3 bg-info-50 border border-info-200 rounded-lg">
            <p className="text-sm text-info-700">
              Para crear un nuevo rol, primero se generara con codigo temporal. Despues de crearlo, podras editarlo.
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <label className="label">Codigo del rol</label>
              <input
                type="text"
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                placeholder="Ej. CAJERO"
              />
            </div>
          )}
          <div>
            <label className="label">Nombre del rol</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej. Cajero"
            />
          </div>

          <div>
            <label className="label">Descripcion (opcional)</label>
            <input
              type="text"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rol para cajeros de farmacia"
            />
          </div>

          <div>
            <label className="label">Permisos</label>
            <p className="text-xs text-ink-400 mb-3">
              Selecciona los permisos que tendra este rol.
            </p>
            <div className="space-y-4">
              {Object.entries(grouped).map(([resource, perms]) => (
                <div key={resource}>
                  <p className="text-sm font-semibold text-ink-700 mb-2">
                    {resourceLabel(resource)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePermission(p.code)}
                        className={`px-3 py-1.5 text-sm rounded-md border font-medium transition-colors ${
                          selectedCodes.includes(p.code)
                            ? "bg-primary-100 border-primary-300 text-primary-700"
                            : "bg-white border-ink-200 text-ink-600 hover:border-ink-300"
                        }`}
                        title={p.description}
                      >
                        {p.action}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Guardando..." : isEdit ? "Actualizar" : "Crear rol"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

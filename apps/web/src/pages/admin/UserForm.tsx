import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

const ROLE_OPTIONS = ["ADMIN", "DOCTOR", "NURSE", "RECEPTION", "CAJERO", "PATIENT"];

const SPECIALTY_OPTIONS = [
  { value: "GEN", label: "Medicina General" },
  { value: "PED", label: "Pediatria" },
  { value: "GIN", label: "Ginecologia" },
  { value: "CAR", label: "Cardiologia" },
  { value: "DER", label: "Dermatologia" },
  { value: "TRA", label: "Traumatologia" },
  { value: "NEU", label: "Neurologia" },
  { value: "PSI", label: "Psiquiatria" },
  { value: "OFT", label: "Oftalmologia" },
  { value: "ORL", label: "Otorrinolaringologia" },
  { value: "URO", label: "Urologia" },
  { value: "MED_INT", label: "Medicina Interna" },
  { value: "CIR", label: "Cirugia General" },
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  INVITED: "Invitado",
  LOCKED: "Bloqueado",
  DISABLED: "Deshabilitado",
};

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s;
}

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Super Admin",
  ADMIN: "Administrador",
  DOCTOR: "Doctor",
  NURSE: "Enfermero",
  RECEPTION: "Recepcion",
  CAJERO: "Cajero",
  PATIENT: "Paciente",
};
const STATUS_OPTIONS = ["ACTIVE", "INVITED", "LOCKED", "DISABLED"];

interface UserFormData {
  email: string;
  fullName: string;
  password: string;
  roles: string[];
  branchId: string;
  status: string;
  specialtyCode: string;
  cedulaProfesional: string;
}

export default function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id) && id !== "new";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>({
    email: "",
    fullName: "",
    password: "",
    roles: [],
    branchId: "",
    status: "ACTIVE",
    specialtyCode: "GEN",
    cedulaProfesional: "",
  });
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    api.get("/admin/branches").then(({ data }: any) => {
      setBranches(data?.data ?? data ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      api.get(`/admin/users/${id}`).then(({ data }: { data: UserFormData & { id: string; branchId: string | null } }) => {
        setForm({
          email: data.email,
          fullName: data.fullName,
          password: "",
          roles: data.roles,
          branchId: data.branchId ?? "",
          status: data.status,
          specialtyCode: data.specialtyCode ?? "GEN",
          cedulaProfesional: data.cedulaProfesional ?? "",
        });
      }).catch((err) => setError(extractErrorMessage(err)));
    }
  }, [isEdit, id]);

  const setRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      roles: [role],
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isEdit) {
        const body: Record<string, unknown> = {
          email: form.email,
          fullName: form.fullName,
          roles: form.roles,
          status: form.status,
          branchId: form.branchId || null,
        };
        if (form.roles.includes("DOCTOR")) {
          body.specialtyCode = form.specialtyCode;
          body.cedulaProfesional = form.cedulaProfesional;
        }
        await api.patch(`/admin/users/${id}`, body);
      } else {
        const body: Record<string, unknown> = {
          email: form.email,
          fullName: form.fullName,
          password: form.password,
          roles: form.roles,
          branchId: form.branchId || null,
        };
        if (form.roles.includes("DOCTOR")) {
          body.specialtyCode = form.specialtyCode;
          body.cedulaProfesional = form.cedulaProfesional;
        }
        await api.post("/admin/users", body);
      }
      navigate("/admin/users");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const newPwd = prompt("Nueva contrasena temporal (min 8 caracteres):");
    if (!newPwd || newPwd.length < 8) return;
    setLoading(true);
    try {
      await api.post(`/admin/users/${id}/reset-password`, { newPassword: newPwd });
      alert("Contrasena actualizada. El usuario debera cambiarla al iniciar sesion.");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">
          {isEdit ? "Editar usuario" : "Nuevo usuario"}
        </h2>
        <button onClick={() => navigate("/admin/users")} className="btn-secondary">
          Volver
        </button>
      </div>

      <div className="card">
        {error && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input
              type="text"
              className="input"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          {!isEdit && (
            <div>
              <label className="label">Contrasena temporal</label>
              <input
                type="text"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 caracteres"
                required
              />
            </div>
          )}

          {isEdit && (
            <div>
              <label className="label">Estado</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={form.roles[0] ?? ""}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="" disabled>Seleccionar rol</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] ?? role}
                </option>
              ))}
            </select>
          </div>

          {form.roles.includes("DOCTOR") && (
            <>
              <div>
                <label className="label">Especialidad</label>
                <select
                  className="input"
                  value={form.specialtyCode}
                  onChange={(e) => setForm({ ...form, specialtyCode: e.target.value })}
                >
                  {SPECIALTY_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Cedula profesional</label>
                <input
                  type="text"
                  className="input"
                  value={form.cedulaProfesional}
                  onChange={(e) => setForm({ ...form, cedulaProfesional: e.target.value })}
                  placeholder="Ej. 12345678"
                />
              </div>
            </>
          )}

          <div>
            <label className="label">Sucursal</label>
            <select
              className="input"
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              <option value="">Sin sucursal</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Guardando..." : isEdit ? "Actualizar" : "Crear usuario"}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="btn-secondary"
              >
                Resetear contrasena
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

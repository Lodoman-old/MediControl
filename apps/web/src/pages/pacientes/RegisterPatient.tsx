import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

const GENDER_OPTIONS = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "X", label: "No especifica" },
];

export default function RegisterPatientPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastNameP: "",
    lastNameM: "",
    email: "",
    phone: "",
    password: "",
    birthDate: "",
    gender: "M",
    curp: "",
    nationality: "",
    occupation: "",
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await api.post("/patients", form);
      setSuccess("Paciente registrado exitosamente");
      setTimeout(() => navigate("/expediente"), 1500);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Registrar paciente</h2>
        <button onClick={() => navigate("/expediente")} className="btn-secondary">
          Volver
        </button>
      </div>

      <div className="card">
        {error && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-lg">
            <p className="text-sm text-success-700">{success}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Nombre(s) *</label>
              <input className="input" value={form.firstName} onChange={update("firstName")} required />
            </div>
            <div>
              <label className="label">Apellido paterno *</label>
              <input className="input" value={form.lastNameP} onChange={update("lastNameP")} required />
            </div>
            <div>
              <label className="label">Apellido materno</label>
              <input className="input" value={form.lastNameM} onChange={update("lastNameM")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email} onChange={update("email")} required />
            </div>
            <div>
              <label className="label">Telefono *</label>
              <input className="input" value={form.phone} onChange={update("phone")} placeholder="+525511111111" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contrasena *</label>
              <input type="password" className="input" value={form.password} onChange={update("password")} required minLength={8} />
            </div>
            <div>
              <label className="label">Fecha de nacimiento *</label>
              <input type="date" className="input" value={form.birthDate} onChange={update("birthDate")} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Genero *</label>
              <select className="input" value={form.gender} onChange={update("gender")}>
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">CURP</label>
              <input className="input" value={form.curp} onChange={update("curp")} maxLength={18} />
            </div>
            <div>
              <label className="label">Nacionalidad</label>
              <input className="input" value={form.nationality} onChange={update("nationality")} />
            </div>
          </div>

          <div>
            <label className="label">Ocupacion</label>
            <input className="input" value={form.occupation} onChange={update("occupation")} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Registrando..." : "Registrar paciente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

const DIAGNOSIS_TYPES = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "SECONDARY", label: "Secundario" },
  { value: "DIFFERENTIAL", label: "Diferencial" },
];
const DIAGNOSIS_STATUSES = [
  { value: "ACTIVE", label: "Activo" },
  { value: "RESOLVED", label: "Resuelto" },
  { value: "SUSPECTED", label: "Sospechado" },
];

export default function NewDiagnosisPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const backPath = appointmentId ? `/appointments/${appointmentId}` : `/expediente/${patientId}`;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    icd10Code: "",
    description: "",
    type: "PRINCIPAL",
    status: "ACTIVE",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/clinical-records/${patientId}/diagnoses`, form);
      navigate(backPath);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link to={backPath} className="text-sm text-primary-600 hover:text-primary-800">
          &larr; Volver al expediente
        </Link>
        <h2 className="text-2xl font-semibold text-ink-900 mt-1">Nuevo diagnostico</h2>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Codigo ICD-10</label>
            <input
              className="input max-w-xs font-mono"
              placeholder="Ej: J45.0"
              value={form.icd10Code}
              onChange={(e) => setForm({ ...form, icd10Code: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Descripcion</label>
            <textarea
              className="input h-24"
              placeholder="Descripcion del diagnostico..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {DIAGNOSIS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {DIAGNOSIS_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Guardando..." : "Guardar diagnostico"}
          </button>
          <button type="button" onClick={() => navigate(backPath)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

const TREATMENT_TYPES = [
  { value: "PHARMACOLOGICAL", label: "Farmacologico" },
  { value: "NON_PHARMACOLOGICAL", label: "No farmacologico" },
  { value: "SURGICAL", label: "Quirurgico" },
];
const TREATMENT_STATUSES = [
  { value: "ACTIVE", label: "Activo" },
  { value: "COMPLETED", label: "Completado" },
  { value: "CANCELLED", label: "Cancelado" },
  { value: "ON_HOLD", label: "En espera" },
];

export default function NewTreatmentPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const backPath = appointmentId ? `/appointments/${appointmentId}` : `/expediente/${patientId}`;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: "",
    type: "PHARMACOLOGICAL",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    indications: "",
    status: "ACTIVE",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        description: form.description,
        type: form.type,
        startDate: new Date(form.startDate).toISOString(),
        status: form.status,
      };
      if (form.endDate) body.endDate = new Date(form.endDate).toISOString();
      if (form.indications) body.indications = form.indications;
      await api.post(`/clinical-records/${patientId}/treatments`, body);
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
        <h2 className="text-2xl font-semibold text-ink-900 mt-1">Nuevo tratamiento</h2>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Descripcion</label>
            <textarea
              className="input h-24"
              placeholder="Ej: Ibuprofeno 400mg cada 8 horas por 7 dias..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TREATMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {TREATMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de inicio</label>
              <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Fecha de fin</label>
              <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Indicaciones</label>
            <textarea
              className="input h-20"
              placeholder="Indicaciones adicionales..."
              value={form.indications}
              onChange={(e) => setForm({ ...form, indications: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Guardando..." : "Guardar tratamiento"}
          </button>
          <button type="button" onClick={() => navigate(backPath)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

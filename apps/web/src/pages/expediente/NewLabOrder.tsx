import { useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

const STUDY_TYPES = [
  { value: "BLOOD", label: "Sangre" },
  { value: "URINE", label: "Orina" },
  { value: "STOOL", label: "Heces" },
  { value: "IMAGE", label: "Imagen" },
  { value: "PATHOLOGY", label: "Patologia" },
  { value: "OTHER", label: "Otro" },
];

export default function NewLabOrderPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const backPath = appointmentId ? `/appointments/${appointmentId}` : `/expediente/${patientId}`;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    studyType: "LABORATORY",
    studyName: "",
    indication: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { studyType: form.studyType, studyName: form.studyName };
      if (form.indication) body.indication = form.indication;
      await api.post(`/clinical-records/${patientId}/lab-orders`, body);
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
        <h2 className="text-2xl font-semibold text-ink-900 mt-1">Nueva solicitud de estudio</h2>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de estudio</label>
              <select className="input" value={form.studyType} onChange={(e) => setForm({ ...form, studyType: e.target.value })}>
                {STUDY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nombre del estudio</label>
              <input
                className="input"
                placeholder="Ej: Biometria hematica"
                value={form.studyName}
                onChange={(e) => setForm({ ...form, studyName: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Indicacion clinica (opcional)</label>
            <textarea
              className="input h-20"
              placeholder="Indicacion para el estudio..."
              value={form.indication}
              onChange={(e) => setForm({ ...form, indication: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Guardando..." : "Solicitar estudio"}
          </button>
          <button type="button" onClick={() => navigate(backPath)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

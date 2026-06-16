import { useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

const CONSENT_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "SURGERY", label: "Cirugia" },
  { value: "ANESTHESIA", label: "Anestesia" },
  { value: "BLOOD_TRANSFUSION", label: "Transfusion sanguinea" },
  { value: "RESEARCH", label: "Investigacion" },
  { value: "OTHERS", label: "Otros" },
];

export default function NewConsentPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const backPath = appointmentId ? `/appointments/${appointmentId}` : `/expediente/${patientId}`;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    consentType: "GENERAL",
    description: "",
    documentUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { consentType: form.consentType, description: form.description };
      if (form.documentUrl) body.documentUrl = form.documentUrl;
      await api.post(`/clinical-records/${patientId}/consents`, body);
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
        <h2 className="text-2xl font-semibold text-ink-900 mt-1">Nuevo consentimiento informado</h2>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Tipo de consentimiento</label>
            <select className="input" value={form.consentType} onChange={(e) => setForm({ ...form, consentType: e.target.value })}>
              {CONSENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Descripcion</label>
            <textarea
              className="input h-24"
              placeholder="Describe el alcance del consentimiento..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">URL del documento (opcional)</label>
            <input
              className="input"
              placeholder="https://..."
              value={form.documentUrl}
              onChange={(e) => setForm({ ...form, documentUrl: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Guardando..." : "Guardar consentimiento"}
          </button>
          <button type="button" onClick={() => navigate(backPath)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

export default function MedicalHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    familyHistory: "",
    nonPathologicalHistory: "",
    pathologicalHistory: "",
    currentIllness: "",
    systemsReview: "",
  });

  useEffect(() => {
    if (!patientId) return;
    api.get(`/clinical-records/${patientId}`)
      .then(({ data }) => {
        setForm({
          familyHistory: data.familyHistory ? JSON.stringify(data.familyHistory, null, 2) : "",
          nonPathologicalHistory: data.nonPathologicalHistory ? JSON.stringify(data.nonPathologicalHistory, null, 2) : "",
          pathologicalHistory: data.pathologicalHistory ? JSON.stringify(data.pathologicalHistory, null, 2) : "",
          currentIllness: data.currentIllness ?? "",
          systemsReview: data.systemsReview ? JSON.stringify(data.systemsReview, null, 2) : "",
        });
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [patientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (form.familyHistory) body.familyHistory = JSON.parse(form.familyHistory);
      if (form.nonPathologicalHistory) body.nonPathologicalHistory = JSON.parse(form.nonPathologicalHistory);
      if (form.pathologicalHistory) body.pathologicalHistory = JSON.parse(form.pathologicalHistory);
      if (form.currentIllness) body.currentIllness = form.currentIllness;
      if (form.systemsReview) body.systemsReview = JSON.parse(form.systemsReview);
      await api.patch(`/clinical-records/${patientId}/history`, body);
      navigate(`/expediente/${patientId}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <p className="text-ink-500">Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link to={`/expediente/${patientId}`} className="text-sm text-primary-600 hover:text-primary-800">
          &larr; Volver al expediente
        </Link>
        <h2 className="text-2xl font-semibold text-ink-900 mt-1">Historia medica</h2>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Antecedentes heredofamiliares</label>
            <textarea
              className="input h-24 font-mono text-sm"
              placeholder='{"diabetes": "Madre", "hipertension": "Padre"}'
              value={form.familyHistory}
              onChange={(e) => setForm({ ...form, familyHistory: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Antecedentes no patologicos</label>
            <textarea
              className="input h-24 font-mono text-sm"
              placeholder='{"tabaquismo": "Negado", "alcoholismo": "Negado"}'
              value={form.nonPathologicalHistory}
              onChange={(e) => setForm({ ...form, nonPathologicalHistory: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Antecedentes patologicos</label>
            <textarea
              className="input h-24 font-mono text-sm"
              placeholder='{"cirugias": ["Apendicectomia 2010"], "cronicos": ["Asma"]}'
              value={form.pathologicalHistory}
              onChange={(e) => setForm({ ...form, pathologicalHistory: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Padecimiento actual</label>
            <textarea
              className="input h-28"
              placeholder="Describe el motivo de consulta y la evolucion del padecimiento actual..."
              value={form.currentIllness}
              onChange={(e) => setForm({ ...form, currentIllness: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Revision por sistemas</label>
            <textarea
              className="input h-24 font-mono text-sm"
              placeholder='{"neurologico": "Sin alteraciones", "cardiovascular": "Normal"}'
              value={form.systemsReview}
              onChange={(e) => setForm({ ...form, systemsReview: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Guardando..." : "Guardar historia medica"}
          </button>
          <button type="button" onClick={() => navigate(`/expediente/${patientId}`)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

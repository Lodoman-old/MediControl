import { useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

export default function NewNotePage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const backPath = appointmentId ? `/appointments/${appointmentId}` : `/expediente/${patientId}`;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    noteDate: new Date().toISOString().slice(0, 16),
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    hasVitals: false,
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    respiratoryRate: "",
    temperature: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    glucose: "",
    vitalNotes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        noteDate: new Date(form.noteDate).toISOString(),
        subjective: form.subjective || undefined,
        objective: form.objective || undefined,
        assessment: form.assessment || undefined,
        plan: form.plan || undefined,
      };
      if (form.hasVitals) {
        const vs: Record<string, unknown> = {};
        if (form.bloodPressureSystolic) vs.bloodPressureSystolic = Number(form.bloodPressureSystolic);
        if (form.bloodPressureDiastolic) vs.bloodPressureDiastolic = Number(form.bloodPressureDiastolic);
        if (form.heartRate) vs.heartRate = Number(form.heartRate);
        if (form.respiratoryRate) vs.respiratoryRate = Number(form.respiratoryRate);
        if (form.temperature) vs.temperature = Number(form.temperature);
        if (form.oxygenSaturation) vs.oxygenSaturation = Number(form.oxygenSaturation);
        if (form.weight) vs.weight = Number(form.weight);
        if (form.height) vs.height = Number(form.height);
        if (form.glucose) vs.glucose = Number(form.glucose);
        if (form.vitalNotes) vs.notes = form.vitalNotes;
        if (Object.keys(vs).length > 0) body.vitalSigns = vs;
      }
      await api.post(`/clinical-records/${patientId}/notes`, body);
      navigate(backPath);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          to={backPath}
          className="text-sm text-primary-600 hover:text-primary-800"
        >
          &larr; Volver al expediente
        </Link>
        <h2 className="text-2xl font-semibold text-ink-900 mt-1">Nueva nota SOAP</h2>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <label className="label">Fecha y hora de la nota</label>
          <input
            type="datetime-local"
            className="input max-w-sm"
            value={form.noteDate}
            onChange={(e) => setForm({ ...form, noteDate: e.target.value })}
          />
        </div>

        <div className="card space-y-4">
          <h3 className="text-lg font-semibold text-ink-900">SOAP</h3>
          <div>
            <label className="label">Subjetivo (S)</label>
            <textarea
              className="input h-24"
              placeholder="Sintomas, molestias, motivo de consulta..."
              value={form.subjective}
              onChange={(e) => setForm({ ...form, subjective: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Objetivo (O)</label>
            <textarea
              className="input h-24"
              placeholder="Hallazgos fisicos, signos vitales..."
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Evaluacion (A)</label>
            <textarea
              className="input h-24"
              placeholder="Diagnostico, impresion clinica..."
              value={form.assessment}
              onChange={(e) => setForm({ ...form, assessment: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Plan (P)</label>
            <textarea
              className="input h-24"
              placeholder="Tratamiento, estudios, referencias..."
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
            />
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink-900">Signos vitales</h3>
            <label className="flex items-center gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={form.hasVitals}
                onChange={(e) => setForm({ ...form, hasVitals: e.target.checked })}
                className="rounded border-ink-300"
              />
              Incluir signos vitales
            </label>
          </div>

          {form.hasVitals && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label">T/A Sistolica</label>
                <input type="number" className="input" placeholder="120" value={form.bloodPressureSystolic}
                  onChange={(e) => setForm({ ...form, bloodPressureSystolic: e.target.value })} />
              </div>
              <div>
                <label className="label">T/A Diastolica</label>
                <input type="number" className="input" placeholder="80" value={form.bloodPressureDiastolic}
                  onChange={(e) => setForm({ ...form, bloodPressureDiastolic: e.target.value })} />
              </div>
              <div>
                <label className="label">Freq. Cardiaca</label>
                <input type="number" className="input" placeholder="72" value={form.heartRate}
                  onChange={(e) => setForm({ ...form, heartRate: e.target.value })} />
              </div>
              <div>
                <label className="label">Freq. Respiratoria</label>
                <input type="number" className="input" placeholder="16" value={form.respiratoryRate}
                  onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} />
              </div>
              <div>
                <label className="label">Temperatura (°C)</label>
                <input type="number" step="0.1" className="input" placeholder="36.5" value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
              </div>
              <div>
                <label className="label">Sat. O2 (%)</label>
                <input type="number" className="input" placeholder="98" value={form.oxygenSaturation}
                  onChange={(e) => setForm({ ...form, oxygenSaturation: e.target.value })} />
              </div>
              <div>
                <label className="label">Peso (kg)</label>
                <input type="number" step="0.1" className="input" placeholder="70" value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
              <div>
                <label className="label">Talla (cm)</label>
                <input type="number" className="input" placeholder="170" value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })} />
              </div>
              <div>
                <label className="label">Glucosa (mg/dL)</label>
                <input type="number" className="input" placeholder="100" value={form.glucose}
                  onChange={(e) => setForm({ ...form, glucose: e.target.value })} />
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className="label">Notas</label>
                <textarea className="input h-16" placeholder="Notas adicionales..." value={form.vitalNotes}
                  onChange={(e) => setForm({ ...form, vitalNotes: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Guardando..." : "Guardar nota"}
          </button>
          <button type="button" onClick={() => navigate(backPath)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

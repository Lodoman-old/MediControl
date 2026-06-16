import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

export default function NewPrescriptionPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const backPath = appointmentId ? `/appointments/${appointmentId}` : `/expediente/${patientId}`;
  const [form, setForm] = useState({
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
    route: "ORAL",
    quantity: "",
    refills: "0",
    indications: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/prescriptions", {
        patientId,
        medication: form.medication,
        dosage: form.dosage,
        frequency: form.frequency,
        duration: form.duration || undefined,
        route: form.route,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        refills: Number(form.refills),
        indications: form.indications || undefined,
        notes: form.notes || undefined,
      });
      navigate(backPath);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-alt">
      <header className="bg-white border-b border-ink-100 px-6 h-16 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-ink-600 hover:text-ink-900">&larr; Volver</button>
        <h1 className="text-lg font-semibold text-ink-900">Nueva receta</h1>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        {error && <div className="card bg-danger-50 border-danger-200 text-danger-700 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Medicamento</label>
                <input className="input" value={form.medication} onChange={(e) => setForm({ ...form, medication: e.target.value })} required />
              </div>
              <div>
                <label className="label">Dosis</label>
                <input className="input" placeholder="500mg" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Frecuencia</label>
                <input className="input" placeholder="Cada 8 horas" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} required />
              </div>
              <div>
                <label className="label">Duracion</label>
                <input className="input" placeholder="7 dias" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div>
                <label className="label">Via</label>
                <select className="input" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })}>
                  <option value="ORAL">Oral</option>
                  <option value="IV">Intravenosa</option>
                  <option value="IM">Intramuscular</option>
                  <option value="SC">Subcutanea</option>
                  <option value="TOPICAL">Topica</option>
                  <option value="INHALED">Inhalada</option>
                  <option value="RECTAL">Rectal</option>
                  <option value="OTHER">Otra</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cantidad</label>
                <input className="input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <label className="label">Refills</label>
                <input className="input" type="number" min="0" max="10" value={form.refills} onChange={(e) => setForm({ ...form, refills: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Indicaciones</label>
              <textarea className="input" rows={3} value={form.indications} onChange={(e) => setForm({ ...form, indications: e.target.value })} />
            </div>
            <div>
              <label className="label">Notas adicionales</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Guardando..." : "Guardar receta"}</button>
          </div>
        </form>
      </main>
    </div>
  );
}

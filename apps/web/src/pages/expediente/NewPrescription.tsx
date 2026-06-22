import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

interface MedOption {
  id: string; name: string; sku: string;
  family?: { id: string; name: string; group?: { id: string; name: string } | null } | null;
}

interface AllergyWarning {
  id: string; severity: string; notes: string | null;
  medication?: { name: string } | null;
  family?: { name: string } | null;
  group?: { name: string } | null;
}

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
  const [medSearch, setMedSearch] = useState("");
  const [meds, setMeds] = useState<MedOption[]>([]);
  const [showMeds, setShowMeds] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);
  const [allergyWarnings, setAllergyWarnings] = useState<AllergyWarning[]>([]);
  const [checkingAllergy, setCheckingAllergy] = useState(false);

  useEffect(() => {
    api.get("/pharmacy/medications?active=true").then(r => setMeds(r.data ?? [])).catch(() => {});
  }, []);

  const filteredMeds = meds.filter(m =>
    !medSearch || m.name.toLowerCase().includes(medSearch.toLowerCase()) || m.sku.toLowerCase().includes(medSearch.toLowerCase())
  ).slice(0, 10);

  const selectMed = async (med: MedOption) => {
    setMedSearch(med.name);
    setForm(f => ({ ...f, medication: med.name }));
    setSelectedMedId(med.id);
    setShowMeds(false);

    if (!patientId) return;
    setCheckingAllergy(true);
    try {
      const { data } = await api.get(`/pharmacy/patients/${patientId}/allergies/check/${med.id}`);
      setAllergyWarnings(data ?? []);
    } catch { setAllergyWarnings([]); }
    finally { setCheckingAllergy(false); }
  };

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

        {allergyWarnings.length > 0 && (
          <div className="mb-4 space-y-2">
            {allergyWarnings.map(w => (
              <div key={w.id} className={`p-3 rounded-lg border text-sm ${
                w.severity === "SEVERE" ? "bg-danger-50 border-danger-200 text-danger-700" :
                w.severity === "MODERATE" ? "bg-warning-50 border-warning-200 text-warning-700" :
                "bg-info-50 border-info-200 text-info-700"
              }`}>
                <p className="font-semibold">
                  {w.severity === "SEVERE" ? "Alergia grave detectada" :
                   w.severity === "MODERATE" ? "Alergia moderada detectada" :
                   "Alergia leve detectada"}
                </p>
                <p className="text-sm mt-1">
                  El paciente es alergico a {w.medication?.name ?? w.family?.name ?? w.group?.name ?? "este medicamento"}
                  {w.family?.name && !w.medication ? ` (familia: ${w.family.name})` : ""}
                  {w.group?.name && !w.family ? ` (grupo: ${w.group.name})` : ""}
                  {w.notes ? `: ${w.notes}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card space-y-4">
            <div className="relative">
              <label className="label">Medicamento</label>
              <input
                className="input w-full"
                placeholder="Buscar medicamento del catalogo..."
                value={medSearch}
                onChange={e => { setMedSearch(e.target.value); setShowMeds(true); setSelectedMedId(null); setAllergyWarnings([]); setForm(f => ({ ...f, medication: e.target.value })); }}
                onFocus={() => setShowMeds(true)}
                onBlur={() => setTimeout(() => setShowMeds(false), 200)}
              />
              {showMeds && medSearch && (
                <div className="absolute z-10 mt-1 w-full border border-ink-200 rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
                  {filteredMeds.length === 0 ? (
                    <p className="p-3 text-sm text-ink-500">Sin resultados</p>
                  ) : filteredMeds.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={() => selectMed(m)}
                      className="w-full text-left px-3 py-2 hover:bg-ink-50 border-b border-ink-50 last:border-0 text-sm"
                    >
                      <span className="font-medium text-ink-900">{m.name}</span>
                      <span className="text-xs text-ink-400 ml-2 font-mono">{m.sku}</span>
                      {m.family && <span className="text-xs text-ink-500 ml-2">{m.family.group?.name ?? ""} &gt; {m.family.name}</span>}
                    </button>
                  ))}
                </div>
              )}
              {checkingAllergy && <p className="text-xs text-ink-500 mt-1">Verificando alergias...</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Dosis</label>
                <input className="input" placeholder="500mg" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} required />
              </div>
              <div>
                <label className="label">Frecuencia</label>
                <input className="input" placeholder="Cada 8 horas" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
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
              <div>
                <label className="label">Cantidad</label>
                <input className="input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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

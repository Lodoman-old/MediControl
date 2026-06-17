import { useState, useEffect } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { appointmentStatusLabel } from "@/lib/roles";

interface PatientInfo {
  id: string;
  fullName: string;
}

interface AppointmentItem {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  patient: PatientInfo;
  service: { name: string };
  doctorName: string;
}

interface VitalsForm {
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  heartRate: string;
  respiratoryRate: string;
  temperature: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
  glucose: string;
  notes: string;
}

const EMPTY_FORM: VitalsForm = {
  bloodPressureSystolic: "",
  bloodPressureDiastolic: "",
  heartRate: "",
  respiratoryRate: "",
  temperature: "",
  oxygenSaturation: "",
  weight: "",
  height: "",
  glucose: "",
  notes: "",
};

export default function TriagePage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [selected, setSelected] = useState<AppointmentItem | null>(null);
  const [form, setForm] = useState<VitalsForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api.get(`/appointments/day/${today}`).then(({ data }: any) => {
      const items: AppointmentItem[] = (data.appointments || []).filter(
        (a: AppointmentItem) => a.status === "CHECKED_IN",
      );
      setAppointments(items);
    }).catch(() => {});
  }, [today]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const vitals: Record<string, any> = {};
      if (form.bloodPressureSystolic) vitals.bloodPressureSystolic = Number(form.bloodPressureSystolic);
      if (form.bloodPressureDiastolic) vitals.bloodPressureDiastolic = Number(form.bloodPressureDiastolic);
      if (form.heartRate) vitals.heartRate = Number(form.heartRate);
      if (form.respiratoryRate) vitals.respiratoryRate = Number(form.respiratoryRate);
      if (form.temperature) vitals.temperature = Number(form.temperature);
      if (form.oxygenSaturation) vitals.oxygenSaturation = Number(form.oxygenSaturation);
      if (form.weight) vitals.weight = Number(form.weight);
      if (form.height) vitals.height = Number(form.height);
      if (form.glucose) vitals.glucose = Number(form.glucose);
      if (form.notes) vitals.notes = form.notes;

      await api.patch(`/appointments/${selected.id}/triage`, vitals);
      setAppointments((prev) => prev.filter((a) => a.id !== selected.id));
      setSelected(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-ink-900">Triage - Signos Vitales</h2>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {selected ? (
        <div className="space-y-6">
          <div className="card">
            <p className="text-sm text-ink-500">
              Paciente: <span className="font-medium text-ink-900">{selected.patient.fullName}</span>
            </p>
            <p className="text-sm text-ink-500 mt-1">
              Servicio: <span className="font-medium text-ink-900">{selected.service.name}</span>
            </p>
            <p className="text-sm text-ink-500 mt-1">
              Medico: <span className="font-medium text-ink-900">{selected.doctorName}</span>
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-ink-900 mb-4">Signos vitales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Presion sistolica (mmHg)</label>
                <input type="number" className="input" placeholder="120" value={form.bloodPressureSystolic}
                  onChange={(e) => setForm({ ...form, bloodPressureSystolic: e.target.value })} />
              </div>
              <div>
                <label className="label">Presion diastolica (mmHg)</label>
                <input type="number" className="input" placeholder="80" value={form.bloodPressureDiastolic}
                  onChange={(e) => setForm({ ...form, bloodPressureDiastolic: e.target.value })} />
              </div>
              <div>
                <label className="label">Frec. cardiaca (lpm)</label>
                <input type="number" className="input" placeholder="72" value={form.heartRate}
                  onChange={(e) => setForm({ ...form, heartRate: e.target.value })} />
              </div>
              <div>
                <label className="label">Frec. respiratoria (rpm)</label>
                <input type="number" className="input" placeholder="16" value={form.respiratoryRate}
                  onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} />
              </div>
              <div>
                <label className="label">Temperatura (°C)</label>
                <input type="number" step="0.1" className="input" placeholder="36.5" value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
              </div>
              <div>
                <label className="label">Saturacion O2 (%)</label>
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
                <input type="number" step="0.1" className="input" placeholder="170" value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })} />
              </div>
              <div>
                <label className="label">Glucosa (mg/dL)</label>
                <input type="number" className="input" placeholder="100" value={form.glucose}
                  onChange={(e) => setForm({ ...form, glucose: e.target.value })} />
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Notas / observaciones</label>
              <textarea className="input" rows={3} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? "Guardando..." : "Guardar y pasar a triage"}
              </button>
              <button onClick={() => { setSelected(null); setForm(EMPTY_FORM); }} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="text-lg font-semibold text-ink-900 mb-4">Pacientes en espera de triage</h3>
          {appointments.length === 0 ? (
            <p className="text-ink-400 text-sm">No hay pacientes registrados esperando triage.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-ink-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">{a.patient.fullName}</p>
                    <p className="text-sm text-ink-500">{a.service.name} - {a.doctorName}</p>
                    <p className="text-xs text-ink-400">
                      {new Date(a.startsAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {appointmentStatusLabel(a.status)}
                    </p>
                  </div>
                  <button onClick={() => setSelected(a)} className="btn-primary text-sm w-full sm:w-auto">
                    Tomar signos
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

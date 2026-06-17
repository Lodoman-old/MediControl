import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

interface PatientDetail {
  id: string;
  mrn: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  bloodType: string | null;
  emergencyContact: Record<string, unknown> | null;
  insurance: Record<string, unknown> | null;
}

interface ClinicalNote {
  id: string;
  appointmentId: string | null;
  noteDate: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  vitalSigns: Record<string, unknown> | null;
  createdAt: string;
}

interface Diagnosis {
  id: string;
  icd10Code: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
}

interface Treatment {
  id: string;
  description: string;
  type: string;
  startDate: string;
  endDate: string | null;
  indications: string | null;
  status: string;
  createdAt: string;
}

interface Consent {
  id: string;
  consentType: string;
  description: string;
  signedAt: string | null;
  documentUrl: string | null;
  createdAt: string;
}

interface LabOrder {
  id: string;
  studyType: string;
  studyName: string;
  indication: string | null;
  status: string;
  createdAt: string;
  results: LabResult[];
}

interface LabResult {
  id: string;
  resultDate: string | null;
  resultText: string | null;
  resultFileUrl: string | null;
  notes: string | null;
  createdAt: string;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  route: string | null;
  quantity: number | null;
  refills: number | null;
  indications: string | null;
  status: string;
  prescribedAt: string;
  doctor: { person: { firstName: string; lastNameP: string } };
}

type Tab = "notes" | "diagnoses" | "treatments" | "consents" | "lab" | "prescriptions";

const TABS: { key: Tab; label: string }[] = [
  { key: "notes", label: "Notas de evolucion" },
  { key: "diagnoses", label: "Diagnosticos" },
  { key: "treatments", label: "Tratamientos" },
  { key: "consents", label: "Consentimientos" },
  { key: "lab", label: "Estudios" },
  { key: "prescriptions", label: "Recetas" },
];

const NOTE_STATUS = { ACTIVE: "Activo", RESOLVED: "Resuelto", SUSPECTED: "Sospechado" } as Record<string, string>;
const DIAGNOSIS_TYPE = { PRINCIPAL: "Principal", SECONDARY: "Secundario", DIFFERENTIAL: "Diferencial" } as Record<string, string>;
const TREATMENT_TYPE = { PHARMACOLOGICAL: "Farmacologico", NON_PHARMACOLOGICAL: "No farmacologico", SURGICAL: "Quirurgico" } as Record<string, string>;
const TREATMENT_STATUS = { ACTIVE: "Activo", COMPLETED: "Completado", CANCELLED: "Cancelado", ON_HOLD: "En espera" } as Record<string, string>;
const CONSENT_TYPE = { GENERAL: "General", SURGERY: "Cirugia", ANESTHESIA: "Anestesia", BLOOD_TRANSFUSION: "Transfusion", RESEARCH: "Investigacion", OTHERS: "Otros" } as Record<string, string>;
const STUDY_TYPE = { LABORATORY: "Laboratorio", IMAGING: "Imagen", PATHOLOGY: "Patologia", OTHER: "Otro" } as Record<string, string>;
const LAB_STATUS = { PENDING: "Pendiente", COLLECTED: "Tomado", IN_PROGRESS: "En proceso", COMPLETED: "Completado", CANCELLED: "Cancelado" } as Record<string, string>;

const downloadPdf = async (id: string) => {
  try {
    const res = await api.get(`/prescriptions/${id}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receta-${id.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {}
};

const downloadAllPrescriptionsPdf = async (patientId: string) => {
  try {
    const res = await api.get(`/prescriptions/patient/${patientId}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recetas-completas-${patientId.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {}
};

const downloadLabOrderPdf = async (patientId: string, orderId: string) => {
  try {
    const res = await api.get(`/clinical-records/${patientId}/lab-orders/${orderId}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solicitud-estudio-${orderId.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {}
};

export default function ExpedientePage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("notes");
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prescMenuOpen, setPrescMenuOpen] = useState(false);
  const prescMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get(`/patients/${patientId}`).then((r) => setPatient(r.data)),
      api.get(`/clinical-records/${patientId}/notes`).then((r) => setNotes(r.data ?? [])).catch(() => {}),
      api.get(`/clinical-records/${patientId}/diagnoses`).then((r) => setDiagnoses(r.data ?? [])).catch(() => {}),
      api.get(`/clinical-records/${patientId}/treatments`).then((r) => setTreatments(r.data ?? [])).catch(() => {}),
      api.get(`/clinical-records/${patientId}/consents`).then((r) => setConsents(r.data ?? [])).catch(() => {}),
      api.get(`/clinical-records/${patientId}/lab-orders`).then((r) => setLabOrders(r.data ?? [])).catch(() => {}),
      api.get(`/prescriptions/patient/${patientId}`).then((r) => setPrescriptions(r.data ?? [])).catch(() => {}),
    ])
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (prescMenuRef.current && !prescMenuRef.current.contains(e.target as Node)) {
        setPrescMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };

  const updateDiagnosisStatus = useCallback(async (id: string, status: string) => {
    try {
      await api.patch(`/clinical-records/${patientId}/diagnoses/${id}`, { status });
      setDiagnoses((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [patientId]);

  const updateTreatmentStatus = useCallback(async (id: string, status: string) => {
    try {
      await api.patch(`/clinical-records/${patientId}/treatments/${id}`, { status });
      setTreatments((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [patientId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <p className="text-ink-500">Cargando expediente...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
        <button onClick={() => navigate("/expediente")} className="btn-secondary">
          Volver a lista de pacientes
        </button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <p className="text-ink-500">Paciente no encontrado</p>
        <button onClick={() => navigate("/expediente")} className="btn-secondary">
          Volver a lista de pacientes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link to="/expediente" className="text-sm text-primary-600 hover:text-primary-800">
            &larr; Pacientes
          </Link>
          <h2 className="text-xl sm:text-2xl font-semibold text-ink-900 mt-1">{patient.fullName}</h2>
          <p className="text-sm text-ink-500">
            Exp: {patient.mrn} &middot; {patient.bloodType ? `Sangre: ${patient.bloodType}` : ""}
          </p>
        </div>
        <Link
          to={`/expediente/${patientId}/history`}
          className="btn-secondary text-sm w-full sm:w-auto text-center"
        >
          Historia medica
        </Link>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="flex gap-1 border-b border-ink-100 min-w-max px-4 sm:px-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 sm:px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-ink-500 hover:text-ink-700"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="flex-1 min-w-4" />
          {activeTab === "notes" && (
            <button
              onClick={() => navigate(`/expediente/${patientId}/notes/new`)}
              className="text-sm text-primary-600 hover:text-primary-800 px-2 whitespace-nowrap"
            >
              + Nueva nota
            </button>
          )}
          {activeTab === "diagnoses" && (
            <button
              onClick={() => navigate(`/expediente/${patientId}/diagnoses/new`)}
              className="text-sm text-primary-600 hover:text-primary-800 px-2 whitespace-nowrap"
            >
              + Agregar diagnostico
            </button>
          )}
          {activeTab === "treatments" && (
            <button
              onClick={() => navigate(`/expediente/${patientId}/treatments/new`)}
              className="text-sm text-primary-600 hover:text-primary-800 px-2 whitespace-nowrap"
            >
              + Agregar tratamiento
            </button>
          )}
          {activeTab === "consents" && (
            <button
              onClick={() => navigate(`/expediente/${patientId}/consents/new`)}
              className="text-sm text-primary-600 hover:text-primary-800 px-2 whitespace-nowrap"
            >
              + Agregar consentimiento
            </button>
          )}
          {activeTab === "lab" && (
            <button
              onClick={() => navigate(`/expediente/${patientId}/lab-orders/new`)}
              className="text-sm text-primary-600 hover:text-primary-800 px-2 whitespace-nowrap"
            >
              + Solicitar estudio
            </button>
          )}
          {activeTab === "prescriptions" && (
            <div className="relative" ref={prescMenuRef}>
              <button
                type="button"
                onClick={() => setPrescMenuOpen((o) => !o)}
                className="text-sm text-primary-600 hover:text-primary-800 px-2 whitespace-nowrap"
              >
                Recetas ▾
              </button>
              {prescMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-ink-200 rounded-lg shadow-lg py-1 min-w-44 z-50">
                  <button
                    onClick={() => { setPrescMenuOpen(false); navigate(`/expediente/${patientId}/prescriptions/new`); }}
                    className="block w-full text-left px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    + Nueva receta
                  </button>
                  <button
                    onClick={() => { setPrescMenuOpen(false); downloadAllPrescriptionsPdf(patientId); }}
                    className="block w-full text-left px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    Receta completa PDF
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === "notes" && (
        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-ink-500 text-sm">No hay notas de evolucion</p>
              <button
                onClick={() => navigate(`/expediente/${patientId}/notes/new`)}
                className="btn-primary mt-4"
              >
                Crear primera nota
              </button>
            </div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="card">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs text-ink-500">{formatDate(n.noteDate)}</span>
                  <span className="text-xs text-ink-400">#{n.id.slice(0, 8)}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {n.subjective && (
                    <div>
                      <p className="text-xs font-medium text-ink-500 mb-1">Subjetivo (S)</p>
                      <p className="text-sm text-ink-900 whitespace-pre-wrap">{n.subjective}</p>
                    </div>
                  )}
                  {n.objective && (
                    <div>
                      <p className="text-xs font-medium text-ink-500 mb-1">Objetivo (O)</p>
                      <p className="text-sm text-ink-900 whitespace-pre-wrap">{n.objective}</p>
                    </div>
                  )}
                  {n.assessment && (
                    <div>
                      <p className="text-xs font-medium text-ink-500 mb-1">Evaluacion (A)</p>
                      <p className="text-sm text-ink-900 whitespace-pre-wrap">{n.assessment}</p>
                    </div>
                  )}
                  {n.plan && (
                    <div>
                      <p className="text-xs font-medium text-ink-500 mb-1">Plan (P)</p>
                      <p className="text-sm text-ink-900 whitespace-pre-wrap">{n.plan}</p>
                    </div>
                  )}
                </div>
                {n.vitalSigns && (
                  <div className="mt-3 pt-3 border-t border-ink-100">
                    <p className="text-xs font-medium text-ink-500 mb-2">Signos vitales</p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {Object.entries(n.vitalSigns as Record<string, unknown>).map(([k, v]) => (
                        v !== null && v !== undefined && v !== "" && (
                          <span key={k} className="bg-ink-50 px-2 py-1 rounded text-ink-700 text-xs">
                            {k}: {String(v)}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "diagnoses" && (
        <div className="space-y-4">
          {diagnoses.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-ink-500 text-sm">No hay diagnosticos registrados</p>
            </div>
          ) : (
            diagnoses.map((d) => (
              <div key={d.id} className="card flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-primary-700">{d.icd10Code}</span>
                    <span className="badge">{DIAGNOSIS_TYPE[d.type] ?? d.type}</span>
                    <select
                      value={d.status}
                      onChange={(e) => updateDiagnosisStatus(d.id, e.target.value)}
                      className={`text-xs rounded border-0 px-2 py-0.5 font-medium cursor-pointer ${
                        d.status === "ACTIVE" ? "bg-warning-100 text-warning-700" :
                        d.status === "RESOLVED" ? "bg-success-100 text-success-700" :
                        "bg-ink-100 text-ink-700"
                      }`}
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="RESOLVED">Resuelto</option>
                      <option value="SUSPECTED">Sospechado</option>
                    </select>
                  </div>
                  <p className="text-sm text-ink-900 mt-1">{d.description}</p>
                  <p className="text-xs text-ink-500 mt-1">{formatDate(d.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "treatments" && (
        <div className="space-y-4">
          {treatments.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-ink-500 text-sm">No hay tratamientos registrados</p>
            </div>
          ) : (
            treatments.map((t) => (
              <div key={t.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="badge">{TREATMENT_TYPE[t.type] ?? t.type}</span>
                      <select
                        value={t.status}
                        onChange={(e) => updateTreatmentStatus(t.id, e.target.value)}
                        className={`text-xs rounded border-0 px-2 py-0.5 font-medium cursor-pointer ${
                          t.status === "ACTIVE" ? "bg-success-100 text-success-700" :
                          t.status === "COMPLETED" ? "bg-ink-100 text-ink-700" :
                          t.status === "CANCELLED" ? "bg-danger-100 text-danger-700" :
                          "bg-warning-100 text-warning-700"
                        }`}
                      >
                        <option value="ACTIVE">Activo</option>
                        <option value="COMPLETED">Completado</option>
                        <option value="CANCELLED">Cancelado</option>
                        <option value="ON_HOLD">En espera</option>
                      </select>
                    </div>
                    <p className="text-sm text-ink-900 mt-2">{t.description}</p>
                    {t.indications && (
                      <p className="text-xs text-ink-600 mt-1">Indicaciones: {t.indications}</p>
                    )}
                    <p className="text-xs text-ink-500 mt-1">
                      Inicio: {formatDate(t.startDate)}
                      {t.endDate ? ` · Fin: ${formatDate(t.endDate)}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "consents" && (
        <div className="space-y-4">
          {consents.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-ink-500 text-sm">No hay consentimientos registrados</p>
            </div>
          ) : (
            consents.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge">{CONSENT_TYPE[c.consentType] ?? c.consentType}</span>
                      {c.signedAt && <span className="badge bg-success-100 text-success-700">Firmado</span>}
                    </div>
                    <p className="text-sm text-ink-900 mt-2">{c.description}</p>
                    <p className="text-xs text-ink-500 mt-1">
                      {c.signedAt ? `Firmado: ${formatDate(c.signedAt)}` : "Pendiente de firma"}
                    </p>
                  </div>
                  {c.documentUrl && (
                    <a
                      href={c.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs"
                    >
                      Ver documento
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "lab" && (
        <div className="space-y-4">
          {labOrders.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-ink-500 text-sm">No hay estudios solicitados</p>
            </div>
          ) : (
            labOrders.map((o) => (
              <div key={o.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="badge">{STUDY_TYPE[o.studyType] ?? o.studyType}</span>
                      <span className={`badge ${
                        o.status === "COMPLETED" ? "bg-success-100 text-success-700" :
                        o.status === "CANCELLED" ? "bg-danger-100 text-danger-700" :
                        o.status === "PENDING" ? "bg-warning-100 text-warning-700" :
                        "bg-info-100 text-info-700"
                      }`}>
                        {LAB_STATUS[o.status] ?? o.status}
                      </span>
                      <button
                        onClick={() => downloadLabOrderPdf(patientId!, o.id)}
                        className="btn-secondary text-xs ml-auto"
                      >
                        PDF
                      </button>
                    </div>
                    <p className="text-sm font-medium text-ink-900 mt-2">{o.studyName}</p>
                    {o.indication && (
                      <p className="text-xs text-ink-600 mt-1">Indicacion: {o.indication}</p>
                    )}
                    <p className="text-xs text-ink-500 mt-1">{formatDate(o.createdAt)}</p>

                    {o.results && o.results.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-ink-100 space-y-2">
                        <p className="text-xs font-medium text-ink-500">Resultados</p>
                        {o.results.map((r) => (
                          <div key={r.id} className="bg-ink-50 p-2 rounded text-sm">
                            {r.resultDate && (
                              <p className="text-xs text-ink-500">{formatDate(r.resultDate)}</p>
                            )}
                            {r.resultText && (
                              <p className="text-ink-900 whitespace-pre-wrap">{r.resultText}</p>
                            )}
                            {r.notes && (
                              <p className="text-xs text-ink-600 mt-1">{r.notes}</p>
                            )}
                            {r.resultFileUrl && (
                              <a href={r.resultFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                                Ver archivo adjunto
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "prescriptions" && (
        <div className="space-y-4">
          {prescriptions.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-ink-500 text-sm">No hay recetas registradas</p>
            </div>
          ) : (
            prescriptions.map((p) => (
              <div key={p.id} className="card p-3 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink-900">{p.medication} {p.dosage}</span>
                      <span className={`badge ${
                        p.status === "ACTIVE" ? "bg-success-100 text-success-700" :
                        p.status === "COMPLETED" ? "bg-ink-100 text-ink-700" :
                        "bg-danger-100 text-danger-700"
                      }`}>
                        {p.status === "ACTIVE" ? "Activa" : p.status === "COMPLETED" ? "Completada" : "Cancelada"}
                      </span>
                    </div>
                    <p className="text-sm text-ink-600 mt-1">{p.frequency} · Via {p.route ?? "ORAL"}{p.duration ? ` · ${p.duration}` : ""}</p>
                    {p.quantity && <p className="text-xs text-ink-500">Cantidad: {p.quantity}{p.refills ? ` (${p.refills} refills)` : ""}</p>}
                    {p.indications && <p className="text-xs text-ink-600 mt-1">Indicaciones: {p.indications}</p>}
                    {p.doctor && (
                      <p className="text-xs text-ink-500 mt-1">
                        Recetado por: {p.doctor.person.firstName} {p.doctor.person.lastNameP}
                      </p>
                    )}
                    <p className="text-xs text-ink-400 mt-1">{formatDate(p.prescribedAt)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {p.status === "ACTIVE" && (
                      <button
                        onClick={() => navigate(`/farmacia/pos?prescriptionId=${p.id}`)}
                        className="btn-primary text-xs whitespace-nowrap"
                      >
                        Surtir
                      </button>
                    )}
                    <button
                      onClick={() => downloadPdf(p.id)}
                      className="btn-secondary text-xs whitespace-nowrap"
                    >
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

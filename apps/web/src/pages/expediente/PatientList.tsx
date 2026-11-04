import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";
import { buildPatientGreeting, openWhatsapp } from "@/lib/whatsapp";

interface PatientListItem {
  id: string;
  mrn: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  bloodType: string | null;
}

interface PatientListResponse {
  data: PatientListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PatientListPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitePatient, setInvitePatient] = useState<PatientListItem | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    invitationUrl: string;
    emailSent: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const openInvitation = (patient: PatientListItem) => {
    setInvitePatient(patient);
    setInviteEmail(patient.email ?? "");
    setInviteError(null);
    setInviteResult(null);
    setCopied(false);
  };

  const closeInvitation = () => {
    setInvitePatient(null);
    setInviteResult(null);
    setInviteError(null);
    setCopied(false);
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePatient) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      const { data } = await api.post("/patients/" + invitePatient.id + "/portal-invitation", {
        email: inviteEmail.trim() || undefined,
      });
      setInviteResult(data);
    } catch (err) {
      setInviteError(extractErrorMessage(err));
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInvitation = async () => {
    if (!inviteResult) return;
    try {
      await navigator.clipboard.writeText(inviteResult.invitationUrl);
      setCopied(true);
    } catch {
      setInviteError("No se pudo copiar el enlace. Seleccionalo y copialo manualmente.");
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    api.get<PatientListResponse>(`/patients?${params}`)
      .then(({ data }) => {
        setPatients(data.data);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-ink-900">Expediente Clinico</h2>
      <p className="text-ink-500 text-sm">Selecciona un paciente para ver su expediente</p>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="card">
        <input
          className="input max-w-md"
          placeholder="Buscar por nombre o expediente..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-ink-500 text-left">
              <th className="px-4 py-3 font-medium">Expediente</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium">Tipo Sangre</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                  Cargando...
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                  No se encontraron pacientes
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="border-b border-ink-50 hover:bg-ink-50">
                  <td className="px-4 py-3 font-mono text-xs text-ink-600">{p.mrn}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{p.fullName}</td>
                  <td className="px-4 py-3 text-ink-600">{p.email ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-600">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3">{p.bloodType ? <span className="badge">{p.bloodType}</span> : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openInvitation(p)}
                        className="btn-secondary text-xs"
                        title="Generar enlace para que el paciente entre al portal"
                      >
                        Portal
                      </button>
                      {p.phone && (
                        <button
                          onClick={() =>
                            openWhatsapp(p.phone, buildPatientGreeting(p.fullName))
                          }
                          className="btn-secondary text-xs"
                          title="Abrir WhatsApp con este paciente"
                        >
                          WhatsApp
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/expediente/${p.id}`)}
                        className="btn-primary text-xs"
                      >
                        Ver expediente
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-100">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-ink-500">
              Pagina {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {invitePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">Acceso al portal</h3>
                <p className="text-sm text-ink-500">
                  {invitePatient.fullName} · {invitePatient.mrn}
                </p>
              </div>
              <button onClick={closeInvitation} className="text-ink-400 hover:text-ink-700 text-xl leading-none">
                ×
              </button>
            </div>

            {!inviteResult ? (
              <form onSubmit={sendInvitation} className="space-y-4">
                <p className="text-sm text-ink-600">
                  Generaremos un enlace de un solo uso para que el paciente cree su contraseña.
                </p>
                <div>
                  <label htmlFor="invite-email" className="label">Correo del paciente</label>
                  <input
                    id="invite-email"
                    type="email"
                    className="input"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    required
                  />
                </div>

                {inviteError && (
                  <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                    <p className="text-sm text-danger-700">{inviteError}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={closeInvitation} className="btn-secondary text-sm">
                    Cancelar
                  </button>
                  <button type="submit" disabled={inviteLoading} className="btn-primary text-sm">
                    {inviteLoading ? "Generando..." : "Generar invitación"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className={`p-3 rounded-lg border ${inviteResult.emailSent ? "bg-success-50 border-success-200" : "bg-warning-50 border-warning-200"}`}>
                  <p className={`text-sm ${inviteResult.emailSent ? "text-success-700" : "text-warning-700"}`}>
                    {inviteResult.emailSent
                      ? `Correo enviado a ${inviteResult.email}.`
                      : `No hay correo configurado para enviar. Comparte el enlace con el paciente por WhatsApp o copialo.`}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-ink-500 mb-1">Enlace de acceso</p>
                  <div className="flex gap-2">
                    <input readOnly value={inviteResult.invitationUrl} className="input flex-1 text-xs font-mono" />
                    <button type="button" onClick={copyInvitation} className="btn-secondary text-sm shrink-0">
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <p className="text-xs text-ink-400 mt-1">Expira en 1 hora y solo puede usarse una vez.</p>
                </div>

                {invitePatient.phone && (
                  <button
                    type="button"
                    onClick={() =>
                      openWhatsapp(
                        invitePatient.phone!,
                        `Hola ${invitePatient.fullName}, tu clínica creó tu acceso al portal de pacientes. Crea tu contraseña aquí: ${inviteResult.invitationUrl}`,
                      )
                    }
                    className="btn-primary w-full text-sm"
                  >
                    Enviar por WhatsApp
                  </button>
                )}

                <div className="flex justify-end">
                  <button type="button" onClick={closeInvitation} className="btn-secondary text-sm">
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

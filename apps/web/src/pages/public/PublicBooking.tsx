import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";
import Logo from "@/components/Logo";

interface Doctor { id: string; fullName: string; specialtyCode?: string; }
interface Service { id: string; name: string; durationMin: number; defaultPrice: number; }
interface Branch { id: string; name: string; }
interface Clinic { id: string; name: string; slug: string | null; }
interface Slot { start: string; end: string; }
interface AvailableSlotsResponse { available: boolean; slots: Slot[]; }

type OrgParam = { organizationId?: string; slug?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function orgQuery(org: OrgParam): string {
  return org.organizationId
    ? `organizationId=${encodeURIComponent(org.organizationId)}`
    : `slug=${encodeURIComponent(org.slug ?? "")}`;
}

function orgLabel(org: OrgParam): string {
  return org.slug ?? org.organizationId ?? "";
}

export default function PublicBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlOrgId = searchParams.get("organizationId") ?? searchParams.get("orgId") ?? searchParams.get("org") ?? "";
  const urlSlug = searchParams.get("slug") ?? "";

  const [org, setOrg] = useState<OrgParam>(
    urlOrgId ? { organizationId: urlOrgId } : urlSlug ? { slug: urlSlug } : {},
  );
  const [orgInput, setOrgInput] = useState("");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [pickedClinic, setPickedClinic] = useState("");
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [doctorId, setDoctorId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastNameP, setLastNameP] = useState("");
  const [lastNameM, setLastNameM] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("M");
  const [curp, setCurp] = useState("");
  const [reason, setReason] = useState("");

  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  const hasOrg = Boolean(org.organizationId || org.slug);
  const orgKey = orgQuery(org);

  useEffect(() => {
    if (hasOrg) return;
    let alive = true;
    setLoadingClinics(true);
    api.get<Clinic[]>("/public/clinics")
      .then((r) => {
        if (!alive) return;
        const list = r.data ?? [];
        setClinics(list);
        if (list.length === 1 && list[0]) setOrg({ organizationId: list[0].id });
      })
      .catch(() => { if (alive) setClinics([]); })
      .finally(() => { if (alive) setLoadingClinics(false); });
    return () => { alive = false; };
  }, [hasOrg]);

  useEffect(() => {
    if (!hasOrg) return;
    let alive = true;
    setLoadingLists(true);
    setListError("");
    setDoctors([]);
    setServices([]);
    setBranches([]);

    Promise.all([
      api.get<Doctor[]>(`/schedule/public/doctors?${orgKey}`).then((r) => r.data ?? []).catch(() => []),
      api.get<Service[]>(`/schedule/public/services?${orgKey}`).then((r) => r.data ?? []).catch(() => []),
      api.get<Branch[]>(`/schedule/public/branches?${orgKey}`).then((r) => r.data ?? []).catch(() => []),
    ])
      .then(([docs, svcs, brs]) => {
        if (!alive) return;
        setDoctors(docs);
        setServices(svcs);
        setBranches(brs);
        if (docs.length === 0 && svcs.length === 0 && brs.length === 0) {
          setListError("No se encontro informacion para esta clinica. Verifica el enlace o el slug.");
        }
      })
      .finally(() => { if (alive) setLoadingLists(false); });

    return () => { alive = false; };
  }, [hasOrg, orgKey]);

  useEffect(() => {
    if (!hasOrg || !doctorId || !serviceId || !date) {
      setSlots([]);
      setStartTime("");
      return;
    }
    let alive = true;
    setLoadingSlots(true);
    setStartTime("");
    const params: Record<string, string> = { doctorId, date, serviceId };
    if (org.organizationId) params.organizationId = org.organizationId;
    else if (org.slug) params.slug = org.slug;
    api.get<AvailableSlotsResponse>("/public/appointments/check-availability", { params })
      .then((r) => { if (alive) setSlots(r.data?.slots ?? []); })
      .catch(() => { if (alive) setSlots([]); })
      .finally(() => { if (alive) setLoadingSlots(false); });

    return () => { alive = false; };
  }, [hasOrg, doctorId, serviceId, date, orgKey]);

  const useOrgFromInput = () => {
    const value = orgInput.trim();
    if (!value) return;
    if (UUID_RE.test(value)) setOrg({ organizationId: value });
    else setOrg({ slug: value.toLowerCase() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!hasOrg) { setError("Falta la clinica (slug o ID)"); return; }
    if (!doctorId || !serviceId || !branchId || !date || !startTime) { setError("Completa todos los campos de la cita"); return; }
    if (!firstName || !lastNameP || !phone || !birthDate) { setError("Completa los datos del paciente"); return; }

    setLoading(true);
    try {
      const { data } = await api.post("/public/appointments", {
        ...org,
        doctorId,
        serviceId,
        branchId,
        date,
        startTime,
        firstName,
        lastNameP,
        lastNameM: lastNameM || undefined,
        phone,
        birthDate,
        gender,
        curp: curp || undefined,
        reason: reason || undefined,
      });
      setSubmittedData(data);
      setSuccess(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resetToBooking = () => {
    setSuccess(false);
    setSubmittedData(null);
    setStartTime("");
    setSlots([]);
  };

  const today = new Date().toISOString().slice(0, 10);
  const selectedService = services.find((s) => s.id === serviceId);

  if (success) {
    const d = submittedData;
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
        <div className="max-w-xl mx-auto px-4 py-10 sm:py-16 space-y-4 sm:space-y-6">
          <div className="text-center">
            <Logo variant="horizontal" className="h-10 mx-auto mb-4" />
          </div>
          <div className="card p-6 text-center">
            <svg className="mx-auto h-16 w-16 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-ink-900">Cita agendada correctamente</h2>
            <p className="mt-1 text-sm text-ink-500">Guarda este comprobante</p>
          </div>
          <div className="card p-4">
            <dl className="grid gap-3 text-sm">
              <div><dt className="text-ink-500">Medico</dt><dd className="font-medium">{d.doctor}</dd></div>
              <div><dt className="text-ink-500">Servicio</dt><dd>{d.service}</dd></div>
              <div><dt className="text-ink-500">Sucursal</dt><dd>{d.branch}</dd></div>
              <div><dt className="text-ink-500">Fecha y hora</dt><dd className="font-mono">{new Date(`${date}T12:00:00`).toLocaleDateString("es-MX", { dateStyle: "full" })} · {startTime} h</dd></div>
              <div><dt className="text-ink-500">Precio estimado</dt><dd className="font-mono font-semibold text-primary-700">${Number(d.priceQuoted).toFixed(2)} {d.currency}</dd></div>
            </dl>
            <button onClick={resetToBooking} className="mt-4 btn-primary w-full">Agendar otra cita</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14 space-y-4 sm:space-y-6">
        <div className="text-center">
          <Logo variant="horizontal" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-900">Reservar cita en linea</h1>
          <p className="text-ink-500 mt-2">Selecciona medico, servicio y horario disponible</p>
        </div>

        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">{error}</div>
        )}
        {listError && (
          <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg text-sm text-warning-700">{listError}</div>
        )}

        {!hasOrg && (
          <div className="card space-y-3">
            {loadingClinics && <p className="text-sm text-ink-500">Cargando clinicas...</p>}

            {!loadingClinics && clinics.length > 0 && !manualMode && (
              <>
                <label className="label">Selecciona tu clinica</label>
                <select className="input" value={pickedClinic} onChange={(e) => setPickedClinic(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  onClick={() => { if (pickedClinic) setOrg({ organizationId: pickedClinic }); }}
                  className="btn-primary w-full"
                  disabled={!pickedClinic}
                >
                  Continuar
                </button>
                <button type="button" onClick={() => setManualMode(true)} className="text-xs text-ink-500 hover:text-ink-700 w-full">
                  Usar enlace o ID manual
                </button>
              </>
            )}

            {!loadingClinics && (clinics.length === 0 || manualMode) && (
              <>
                <label className="label">Clinica (slug publico o ID)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ej. demo  o  el UUID de la organizacion"
                  value={orgInput}
                  onChange={(e) => setOrgInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); useOrgFromInput(); } }}
                />
                <button onClick={useOrgFromInput} className="btn-primary w-full" disabled={!orgInput.trim()}>
                  Continuar
                </button>
                {clinics.length > 0 && (
                  <button type="button" onClick={() => setManualMode(false)} className="text-xs text-ink-500 hover:text-ink-700 w-full">
                    Volver a la lista de clinicas
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {hasOrg && (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>Clinica: <strong className="text-ink-700">{orgLabel(org)}</strong></span>
              <button type="button" onClick={() => { setOrg({}); setOrgInput(""); setListError(""); setManualMode(false); setPickedClinic(""); }} className="text-primary-600 hover:text-primary-800 font-medium">
                Cambiar
              </button>
            </div>

            <div>
              <label className="label">Medico *</label>
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="input" required disabled={loadingLists}>
                <option value="">{loadingLists ? "Cargando..." : "Seleccionar..."}</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName}{d.specialtyCode ? ` - ${d.specialtyCode}` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Servicio *</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="input" required disabled={loadingLists}>
                <option value="">{loadingLists ? "Cargando..." : "Seleccionar..."}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (${Number(s.defaultPrice).toFixed(2)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Sucursal *</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input" required disabled={loadingLists}>
                <option value="">{loadingLists ? "Cargando..." : "Seleccionar..."}</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Fecha *</label>
                <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">Horario disponible *</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input"
                  required
                  disabled={loadingSlots || slots.length === 0}
                >
                  <option value="">
                    {loadingSlots ? "Buscando..." : slots.length === 0 ? "Sin horarios disponibles" : "Seleccionar..."}
                  </option>
                  {slots.map((s) => (
                    <option key={s.start} value={s.start}>{s.start} - {s.end}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedService && (
              <p className="text-xs text-ink-500">
                Duracion estimada: {selectedService.durationMin} min
              </p>
            )}

            <div className="border-t border-ink-100 pt-4">
              <h4 className="font-medium text-ink-900 mb-3">Datos del paciente</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label">Nombre *</label><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                <div><label className="label">Apellido paterno *</label><input className="input" value={lastNameP} onChange={(e) => setLastNameP(e.target.value)} required /></div>
              </div>
              <div className="mt-3"><label className="label">Apellido materno</label><input className="input" value={lastNameM} onChange={(e) => setLastNameM(e.target.value)} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div><label className="label">Telefono *</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+525512345678" required /></div>
                <div><label className="label">Fecha de nacimiento *</label><input type="date" max={today} className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="label">Genero</label>
                  <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="X">Otro</option>
                  </select>
                </div>
                <div><label className="label">CURP</label><input className="input" value={curp} onChange={(e) => setCurp(e.target.value)} placeholder="Opcional" /></div>
              </div>
              <div className="mt-3"><label className="label">Motivo de la cita</label><textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Opcional" /></div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? "Reservando..." : "Reservar cita"}
            </button>
          </form>
        )}

        <div className="text-center">
          <button onClick={() => navigate("/login")} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}

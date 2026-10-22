import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

interface Doctor { id: string; fullName: string; }
interface Service { id: string; name: string; durationMin: number; defaultPrice: number; }
interface Branch { id: string; name: string; }
interface Slot { start: string; end: string; }
interface AvailableSlotsResponse { available: boolean; slots: Slot[]; }

async function fetchDoctors(orgId: string): Promise<Doctor[]> {
  const { data } = await api.get<Doctor[]>(`/schedule/public/doctors?organizationId=${orgId}`);
  return data ?? [];
}
async function fetchServices(orgId: string): Promise<Service[]> {
  const { data } = await api.get<Service[]>(`/schedule/public/services?organizationId=${orgId}`);
  return data ?? [];
}
async function fetchBranches(orgId: string): Promise<Branch[]> {
  const { data } = await api.get<{ data: Branch[] }>(`/admin/branches?organizationId=${orgId}`);
  return data.data ?? data ?? [];
}
async function checkAvailability(orgId: string, doctorId: string, date: string, serviceId: string): Promise<AvailableSlotsResponse> {
  const { data } = await api.get<AvailableSlotsResponse>(`/public/appointments/check-availability`, {
    params: { organizationId: orgId, doctorId, date, serviceId },
  });
  return data ?? { available: false, slots: [] };
}
async function bookAppointment(body: {
  organizationId: string;
  doctorId: string;
  serviceId: string;
  branchId: string;
  date: string;
  startTime: string;
  firstName: string;
  lastNameP: string;
  lastNameM?: string;
  phone: string;
  birthDate: string;
  gender: string;
  curp?: string;
  reason?: string;
}) {
  const { data } = await api.post("/public/appointments", body);
  return data;
}

export default function PublicBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgIdFromUrl = searchParams.get("orgId") ?? searchParams.get("org") ?? "";
  const slugFromUrl = searchParams.get("slug") ?? "";

  const [orgId, setOrgId] = useState(orgIdFromUrl);
  const [slug, setSlug] = useState(slugFromUrl);

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Load doctors/services/branches when orgId or slug changes
  useEffect(() => {
    const id = orgId ?? slug;
    if (!id) return;
    const param = orgId ? `organizationId=${orgId}` : `slug=${slug}`;
    api.get<Doctor[]>(`/schedule/public/doctors?${param}`).then((r) => setDoctors(r.data ?? [])).catch(() => setDoctors([]));
    api.get<Service[]>(`/schedule/public/services?${param}`).then((r) => setServices(r.data ?? [])).catch(() => setServices([]));
    api.get<{ data: Branch[] }>(`/admin/branches?${param}`).then((r) => setBranches(r.data?.data ?? r.data ?? [])).catch(() => setBranches([]));
  }, [orgId, slug]);

  // Load slots when doctor, service, date change
  useEffect(() => {
    if (!doctorId || !serviceId || !date || !orgId) {
      setSlots([]);
      return;
    }
    const param = orgId ? `organizationId=${orgId}` : `slug=${slug}`;
    checkAvailability(orgId, doctorId, date, serviceId)
      .then((r) => setSlots(r.slots ?? []))
      .catch(() => setSlots([]));
  }, [doctorId, serviceId, date, orgId, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!orgId) { setError("Selecciona una organizacion"); return; }
    if (!doctorId || !serviceId || !branchId || !date || !startTime) { setError("Completa todos los campos"); return; }
    if (!firstName || !lastNameP || !phone || !birthDate) { setError("Completa todos los campos del paciente"); return; }

    setLoading(true);
    try {
      const res = await bookAppointment({
        organizationId: orgId,
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
      setSubmittedData(res);
      setSuccess(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const d = submittedData;
    return (
      <div className="max-w-xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center py-8">
          <svg className="mx-auto h-16 w-16 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-ink-900">Cita agendada correctamente</h2>
        </div>
        <div className="card p-4">
          <dl className="grid gap-3 text-sm">
            <div><dt className="text-ink-500">Medico</dt><dd className="font-medium">{d.doctor}</dd></div>
            <div><dt className="text-ink-500">Servicio</dt><dd>{d.service}</dd></div>
            <div><dt className="text-ink-500">Sucursal</dt><dd>{d.branch}</dd></div>
            <div><dt className="text-ink-500">Fecha y hora</dt><dd className="font-mono">{new Date(d.startsAt).toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" })}</dd></div>
            <div><dt className="text-ink-500">Precio estimado</dt><dd className="font-mono font-semibold text-primary-700">${Number(d.priceQuoted).toFixed(2)} {d.currency}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-ink-500">Guarda este comprobante. Recibiras un recordatorio antes de tu cita.</p>
          <button onClick={() => navigate("/reservar")} className="mt-4 btn-primary w-full">Agendar otra cita</button>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-ink-900">Reservar cita en linea</h2>
        <p className="text-ink-500 mt-1">Selecciona medico, servicio y horario disponible</p>
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">{error}</div>
      )}

      {!orgId && !slug && (
        <div className="card space-y-3">
          <label className="label">Clinica (Organization ID o Slug)</label>
          <input
            type="text"
            className="input"
            placeholder="Ingresa el ID de la organizacion o el slug publico"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            required
          />
          <button onClick={() => setOrgId(orgId)} className="btn-primary" disabled={!orgId}>
            Continuar
          </button>
        </div>
      )}

      {orgId && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Medico</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="input" required>
              <option value="">Seleccionar...</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Servicio</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="input" required>
              <option value="">Seleccionar...</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} (${Number(s.defaultPrice).toFixed(2)})</option>)}
            </select>
          </div>

          <div>
            <label className="label">Sucursal</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input" required>
              <option value="">Seleccionar...</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="label">Horario disponible</label>
              <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" required disabled={slots.length === 0}>
                <option value="">Seleccionar...</option>
                {slots.map((s) => (
                  <option key={s.start} value={new Date(s.start).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}>
                    {new Date(s.start).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })} - {new Date(s.end).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </option>
                ))}
                {slots.length === 0 && <option value="" disabled>Sin horarios disponibles</option>}
              </select>
            </div>
          </div>

          <div className="border-t border-ink-100 pt-4">
            <h4 className="font-medium text-ink-900 mb-3">Datos del paciente</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Nombre *</label><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
              <div><label className="label">Apellido paterno *</label><input className="input" value={lastNameP} onChange={(e) => setLastNameP(e.target.value)} required /></div>
            </div>
            <div><label className="label">Apellido materno</label><input className="input" value={lastNameM} onChange={(e) => setLastNameM(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Telefono *</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+52..." required /></div>
              <div><label className="label">Fecha nacimiento *</label><input type="date" className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Genero</label><select className="input" value={gender} onChange={(e) => setGender(e.target.value)}><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">Otro</option></select></div>
              <div><label className="label">CURP</label><input className="input" value={curp} onChange={(e) => setCurp(e.target.value)} placeholder="Opcional" /></div>
            </div>
            <div><label className="label">Motivo</label><textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Opcional" /></div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Reservando..." : "Reservar cita"}
          </button>
        </form>
      )}
    </div>
  );
}
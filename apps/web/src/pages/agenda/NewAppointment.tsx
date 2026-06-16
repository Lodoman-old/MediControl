import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";

interface Doctor {
  id: string;
  fullName: string;
}

interface Patient {
  id: string;
  fullName: string;
}

interface Service {
  id: string;
  name: string;
  durationMin: number;
  defaultPrice: number;
}

interface Branch {
  id: string;
  name: string;
}

interface AvailableSlot {
  start: string;
  end: string;
}

function SearchableSelect<T extends { id: string; fullName: string }>({
  items, value, onChange, placeholder, disabled,
}: {
  items: T[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = items.find((i) => i.id === value);

  const filtered = useMemo(
    () => items.filter((i) => i.fullName.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        className="input"
        placeholder={placeholder}
        value={open ? search : (selected?.fullName ?? "")}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setSearch(""); }}
        disabled={disabled}
      />
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-ink-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 w-full">
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-ink-400">Sin resultados</p>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-ink-50 ${item.id === value ? "bg-primary-50 font-medium" : ""}`}
              onClick={() => { onChange(item.id); setOpen(false); setSearch(""); }}
            >
              {item.fullName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewAppointmentPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [freeBlocks, setFreeBlocks] = useState<AvailableSlot[]>([]);

  const [branchId, setBranchId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("");
  const [reason, setReason] = useState("");
  const [price, setPrice] = useState(0);

  useEffect(() => {
    api.get("/admin/users?limit=100&role=DOCTOR").then((r) => {
      setDoctors(r.data.data ?? []);
    }).catch(() => setDoctors([]));
    api.get("/admin/users?limit=100&role=PATIENT").then((r) => {
      setPatients(r.data.data ?? []);
    }).catch(() => setPatients([]));
    api.get("/admin/branches").then(({ data }: any) => setBranches(data?.data ?? data ?? [])).catch(() => {});
    api.get("/services").then(({ data }: any) => setServices(data?.data ?? data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (serviceId) {
      const svc = services.find((s) => s.id === serviceId);
      if (svc) setPrice(Number(svc.defaultPrice));
    }
  }, [serviceId, services]);

  const loadSlots = async () => {
    if (!doctorId || !date || !serviceId) return;
    try {
      const { data } = await api.get<AvailableSlot[]>("/schedule/available-slots", {
        params: { doctorId, date },
      });
      const today = new Date();
      const isToday = date === today.toISOString().slice(0, 10);
      const filtered = (data ?? []).filter((b) => {
        if (!isToday) return true;
        return new Date(b.end).getTime() > today.getTime();
      });
      setFreeBlocks(filtered);
      setStartTime("");
    } catch {
      setFreeBlocks([]);
    }
  };

  const selectedService = services.find((s) => s.id === serviceId);
  const serviceDuration = selectedService?.durationMin ?? 30;

  const isTimeInFreeBlock = (time: string): boolean => {
    if (!time || freeBlocks.length === 0) return false;
    const [h = 0, m = 0] = time.split(":").map(Number);
    const userStart = h * 60 + m;
    const userEnd = userStart + serviceDuration;
    return freeBlocks.some((b) => {
      const s = new Date(b.start);
      const e = new Date(b.end);
      const bStart = s.getHours() * 60 + s.getMinutes();
      const bEnd = e.getHours() * 60 + e.getMinutes();
      return userStart >= bStart && userEnd <= bEnd;
    });
  };

  const localToUtcMinutes = (time: string): number => {
    const [h = 0, m = 0] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const calcEndTime = (time: string): string => {
    if (!time) return "";
    const [h = 0, m = 0] = time.split(":").map(Number);
    const total = h * 60 + m + serviceDuration;
    const endH = Math.floor(total / 60);
    const endM = total % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const formatBlock = (b: AvailableSlot): string => {
    const f = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    return `${f(b.start)} - ${f(b.end)}`;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime) {
      setError("Selecciona una hora de inicio");
      return;
    }
    if (!isTimeInFreeBlock(startTime)) {
      setError("La hora seleccionada no esta disponible para la duracion del servicio");
      return;
    }

    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(startsAt.getTime() + serviceDuration * 60 * 1000);

    if (!branchId || !doctorId || !patientId || !serviceId) {
      setError("Completa todos los campos requeridos");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        doctorId,
        patientId,
        serviceId,
        branchId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: reason || null,
        channel: "IN_PERSON",
        priceQuoted: price,
        currency: "MXN",
      };
      await api.post("/appointments", body);
      navigate("/agenda");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-900">Nueva cita</h2>
        <button onClick={() => navigate("/agenda")} className="btn-secondary">
          Volver a agenda
        </button>
      </div>

      <div className="card">
        {error && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Sucursal</label>
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Medico</label>
              <SearchableSelect
                items={doctors}
                value={doctorId}
                onChange={setDoctorId}
                placeholder="Buscar medico..."
              />
            </div>
            <div>
              <label className="label">Paciente</label>
              <SearchableSelect
                items={patients}
                value={patientId}
                onChange={setPatientId}
                placeholder="Buscar paciente..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Servicio</label>
              <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
                <option value="">Seleccionar...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Precio (MXN)</label>
              <input type="number" className="input" value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={loadSlots} className="btn-secondary w-full">
                Ver horarios disponibles
              </button>
            </div>
          </div>

          {freeBlocks.length > 0 && (
            <div className="card bg-ink-50">
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink-700">Bloques disponibles:</p>
                {freeBlocks.map((b, i) => (
                  <p key={i} className="text-sm text-ink-600 font-mono">{formatBlock(b)}</p>
                ))}
              </div>
            </div>
          )}

          {freeBlocks.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Hora de inicio</label>
                <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div>
                <label className="label">Hora de fin ({serviceDuration} min)</label>
                <input type="time" className="input" value={calcEndTime(startTime)} disabled />
              </div>
            </div>
          )}

          {freeBlocks.length === 0 && doctorId && date && (
            <p className="text-sm text-ink-500">No hay horarios disponibles. Selecciona medico y fecha, luego presiona "Ver horarios disponibles".</p>
          )}

          <div>
            <label className="label">Motivo de consulta</label>
            <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="p-3 bg-info-50 border border-info-200 rounded-lg text-sm text-info-700">
            La cita quedara pendiente de confirmacion. El medico asignara la ubicacion al confirmarla.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creando..." : "Solicitar cita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

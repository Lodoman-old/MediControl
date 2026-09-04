import { useState, useEffect } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

interface Doctor {
  id: string;
  fullName: string;
}

interface ScheduleEntry {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  maxPatients: number | null;
}

interface ScheduleException {
  id: string;
  doctorId: string;
  exceptionDate: string;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
  reason: string | null;
}

interface ScheduleMap {
  [dayOfWeek: number]: ScheduleEntry[];
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function SchedulePage() {
  const currentUser = useAuthStore((s) => s.user);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [editDay, setEditDay] = useState<number | null>(null);
  const [editSchedule, setEditSchedule] = useState<ScheduleEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"schedule" | "exceptions">("schedule");

  // Exception form
  const [excDate, setExcDate] = useState("");
  const [excStartTime, setExcStartTime] = useState("");
  const [excEndTime, setExcEndTime] = useState("");
  const [excIsAvailable, setExcIsAvailable] = useState(false);
  const [excReason, setExcReason] = useState("");
  const [savingExc, setSavingExc] = useState(false);

  const [form, setForm] = useState({
    startTime: "09:00",
    endTime: "18:00",
    isActive: true,
    maxPatients: 0,
  });

  useEffect(() => {
    if (currentUser?.roles.includes("DOCTOR")) {
      setSelectedDoctor(currentUser.id);
    }
    api.get("/admin/users?limit=100&role=DOCTOR").then((r) => {
      const items: any[] = r.data.data || [];
      const docs = items.map((u: any) => ({ id: u.id, fullName: u.fullName }));
      setDoctors(docs);
      if (!currentUser?.roles.includes("DOCTOR") && !selectedDoctor && docs.length === 1) {
        setSelectedDoctor(docs[0]?.id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      api.get(`/schedule?doctorId=${selectedDoctor}`).then(({ data }) => {
        setSchedules(Array.isArray(data) ? data : []);
      }).catch(() => setSchedules([]));
      fetchExceptions();
    } else {
      setSchedules([]);
      setExceptions([]);
    }
  }, [selectedDoctor]);

  const fetchExceptions = async () => {
    if (!selectedDoctor) return;
    try {
      const { data } = await api.get(`/schedule/exceptions?doctorId=${selectedDoctor}`);
      setExceptions(Array.isArray(data) ? data : []);
    } catch {
      setExceptions([]);
    }
  };

  const createException = async () => {
    if (!selectedDoctor || !excDate) return;
    setSavingExc(true);
    setError(null);
    try {
      await api.post("/schedule/exceptions", {
        doctorId: selectedDoctor,
        exceptionDate: excDate,
        startTime: excStartTime || undefined,
        endTime: excEndTime || undefined,
        isAvailable: excIsAvailable,
        reason: excReason || undefined,
      });
      setExcDate(""); setExcStartTime(""); setExcEndTime(""); setExcIsAvailable(false); setExcReason("");
      await fetchExceptions();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingExc(false);
    }
  };

  const deleteException = async (id: string) => {
    if (!confirm("Eliminar esta excepcion?")) return;
    try {
      await api.delete(`/schedule/exceptions/${id}`);
      setExceptions((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const schedByDay: ScheduleMap = {};
  for (const s of schedules) {
    if (!schedByDay[s.dayOfWeek]) schedByDay[s.dayOfWeek] = [];
    schedByDay[s.dayOfWeek]!.push(s);
  }

  const openAdd = (day: number) => {
    setEditDay(day);
    setEditSchedule(null);
    setForm({ startTime: "09:00", endTime: "18:00", isActive: true, maxPatients: 0 });
  };

  const openEdit = (sched: ScheduleEntry) => {
    setEditDay(sched.dayOfWeek);
    setEditSchedule(sched);
    setForm({
      startTime: sched.startTime,
      endTime: sched.endTime,
      isActive: sched.isActive,
      maxPatients: sched.maxPatients ?? 0,
    });
  };

  const saveSchedule = async () => {
    setError(null);
    try {
      if (editSchedule) {
        await api.patch(`/schedule/${editSchedule.id}`, {
          startTime: form.startTime,
          endTime: form.endTime,
          isActive: form.isActive,
          maxPatients: form.maxPatients || null,
        });
      } else {
        await api.post("/schedule", {
          doctorId: selectedDoctor,
          dayOfWeek: editDay,
          startTime: form.startTime,
          endTime: form.endTime,
          isActive: form.isActive,
          maxPatients: form.maxPatients || null,
        });
      }
      const { data } = await api.get(`/schedule?doctorId=${selectedDoctor}`);
      setSchedules(Array.isArray(data) ? data : []);
      setEditDay(null);
      setEditSchedule(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const toggleActive = async (sched: ScheduleEntry) => {
    try {
      await api.patch(`/schedule/${sched.id}`, { isActive: !sched.isActive });
      setSchedules((prev) =>
        prev.map((s) => (s.id === sched.id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Eliminar este horario?")) return;
    try {
      await api.delete(`/schedule/${id}`);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-ink-900">Configuracion de horarios</h2>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="card">
        <label className="label">Medico</label>
        {currentUser?.roles.includes("DOCTOR") ? (
          <p className="text-ink-700 font-medium">{currentUser.fullName}</p>
        ) : (
          <select
            className="input max-w-sm"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="">Seleccionar medico...</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </select>
        )}
      </div>

      {selectedDoctor && (
        <>
          <div className="flex gap-2 border-b border-ink-200 pb-2">
            <button onClick={() => setTab("schedule")} className={`px-3 py-1 text-sm font-medium rounded ${tab === "schedule" ? "bg-primary-100 text-primary-700" : "text-ink-500 hover:text-ink-700"}`}>Horarios</button>
            <button onClick={() => setTab("exceptions")} className={`px-3 py-1 text-sm font-medium rounded ${tab === "exceptions" ? "bg-primary-100 text-primary-700" : "text-ink-500 hover:text-ink-700"}`}>Excepciones</button>
          </div>

          {tab === "schedule" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {DAYS.map((day) => {
                const dayScheds = schedByDay[day] ?? [];
                return (
                  <div key={day} className="card">
                    <h3 className="font-semibold text-ink-900 mb-3">{DAY_NAMES[day]}</h3>
                    {dayScheds.length === 0 ? (
                      <p className="text-sm text-ink-400 mb-3">Libre</p>
                    ) : (
                      <div className="space-y-2 mb-3">
                        {dayScheds.map((s) => (
                          <div key={s.id} className="p-2 rounded bg-ink-50 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-ink-700">
                                {s.startTime} - {s.endTime}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                s.isActive ? "bg-success-100 text-success-700" : "bg-warning-100 text-warning-700"
                              }`}>
                                {s.isActive ? "Activo" : "Inactivo"}
                              </span>
                            </div>
                            {s.maxPatients && (
                              <p className="text-xs text-ink-400 mt-1">max {s.maxPatients} pacientes</p>
                            )}
                            <div className="flex gap-2 mt-1">
                              <button onClick={() => openEdit(s)} className="text-xs text-primary-600 hover:text-primary-800">Editar</button>
                              <button onClick={() => toggleActive(s)} className="text-xs text-ink-500 hover:text-ink-700">
                                {s.isActive ? "Desactivar" : "Activar"}
                              </button>
                              <button onClick={() => deleteSchedule(s.id)} className="text-xs text-danger-600 hover:text-danger-800">Eliminar</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!dayScheds.some((s) => s.dayOfWeek === day && editDay === day) && (
                      <button onClick={() => openAdd(day)} className="btn-secondary text-xs w-full">
                        {dayScheds.length === 0 ? "Agregar horario" : "Agregar otro"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "exceptions" && (
            <div className="space-y-6">
              <div className="card space-y-4 max-w-lg">
                <h3 className="font-semibold text-ink-900">Nueva excepcion (vacacion / bloqueo)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Fecha</label>
                    <input type="date" className="input" value={excDate} onChange={(e) => setExcDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Disponible?</label>
                    <select className="input" value={excIsAvailable ? "true" : "false"} onChange={(e) => setExcIsAvailable(e.target.value === "true")}>
                      <option value="false">No disponible (bloqueado)</option>
                      <option value="true">Disponible (horario especial)</option>
                    </select>
                  </div>
                </div>
                {excIsAvailable && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Hora inicio</label>
                      <input type="time" className="input" value={excStartTime} onChange={(e) => setExcStartTime(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Hora fin</label>
                      <input type="time" className="input" value={excEndTime} onChange={(e) => setExcEndTime(e.target.value)} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Motivo (opcional)</label>
                  <input className="input" value={excReason} onChange={(e) => setExcReason(e.target.value)} placeholder="Ej: Vacaciones, capacitacion..." />
                </div>
                <button onClick={createException} disabled={savingExc || !excDate} className="btn-primary">
                  {savingExc ? "Guardando..." : "Agregar excepcion"}
                </button>
              </div>

              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-ink-50 text-ink-600 text-left">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Horario</th>
                    <th className="px-4 py-3 font-medium">Motivo</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr></thead>
                  <tbody>
                    {exceptions.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-400">No hay excepciones registradas</td></tr>
                    ) : exceptions.map((exc) => (
                      <tr key={exc.id} className="border-t border-ink-100">
                        <td className="px-4 py-3 font-medium">{exc.exceptionDate?.slice(0, 10)}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${exc.isAvailable ? "bg-success-100 text-success-700" : "bg-danger-100 text-danger-700"}`}>
                            {exc.isAvailable ? "Disponible" : "Bloqueado"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-600">
                          {exc.startTime && exc.endTime ? `${exc.startTime} - ${exc.endTime}` : "Todo el dia"}
                        </td>
                        <td className="px-4 py-3 text-ink-500">{exc.reason ?? "—"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteException(exc.id)} className="text-xs text-danger-600 hover:text-danger-800">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {editDay !== null && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { setEditDay(null); setEditSchedule(null); }}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-ink-900 mb-4">
              {editSchedule ? `Editar ${DAY_NAMES[editDay]}` : `Agregar horario ${DAY_NAMES[editDay]}`}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Inicio</label>
                  <input type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="label">Fin</label>
                  <input type="time" className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Max. pacientes por dia (opcional)</label>
                <input type="number" className="input" value={form.maxPatients} onChange={(e) => setForm({ ...form, maxPatients: Number(e.target.value) })} min={0} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <label htmlFor="isActive" className="text-sm text-ink-700">Activo</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveSchedule} className="btn-primary flex-1">
                {editSchedule ? "Guardar cambios" : "Agregar"}
              </button>
              <button onClick={() => { setEditDay(null); setEditSchedule(null); }} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
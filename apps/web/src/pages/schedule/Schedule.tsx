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

interface ScheduleMap {
  [dayOfWeek: number]: ScheduleEntry[];
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function SchedulePage() {
  const currentUser = useAuthStore((s) => s.user);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [editDay, setEditDay] = useState<number | null>(null);
  const [editSchedule, setEditSchedule] = useState<ScheduleEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } else {
      setSchedules([]);
    }
  }, [selectedDoctor]);

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
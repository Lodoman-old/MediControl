import { useState, useEffect } from "react";
import { api, extractErrorMessage } from "@/lib/api";

interface PendingAppointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  reason: string | null;
  patient: {
    person: { firstName: string; lastNameP: string; lastNameM: string | null };
  };
  service: { name: string; durationMin: number };
  branch: { name: string; id: string };
}

interface ServiceLocation {
  id: string;
  name: string;
  branchId: string;
}

export default function DoctorConfirmationsPage() {
  const [pending, setPending] = useState<PendingAppointment[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branchLocations, setBranchLocations] = useState<Record<string, ServiceLocation[]>>({});

  const loadPending = () => {
    api.get("/appointments/doctor/me/pending").then(({ data }) => {
      setPending(Array.isArray(data) ? data : []);
    }).catch(() => setPending([]));
  };

  useEffect(() => {
    loadPending();
    api.get("/service-locations").then(({ data: locsData }: any) => {
      const locs = locsData?.data ?? locsData ?? [];
      const grouped: Record<string, ServiceLocation[]> = {};
      for (const l of locs) {
        const bid = l.branchId;
        if (!grouped[bid]) grouped[bid] = [];
        grouped[bid].push(l);
      }
      setBranchLocations(grouped);
    }).catch(() => {});
  }, []);

  const confirmAppointment = async (appointmentId: string) => {
    if (!selectedLocation) {
      setError("Selecciona una ubicacion");
      return;
    }
    setError(null);
    setConfirmingId(appointmentId);
    try {
      await api.patch(`/appointments/${appointmentId}/confirm`, {
        serviceLocationId: selectedLocation,
      });
      setPending((prev) => prev.filter((a) => a.id !== appointmentId));
      setSelectedLocation("");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setConfirmingId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long",
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-semibold text-ink-900">Citas pendientes de confirmacion</h2>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {pending.length === 0 ? (
        <div className="card">
          <p className="text-ink-500">No hay citas pendientes de confirmacion</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((appt) => {
            const locs = branchLocations[appt.branch?.id] ?? [];
            return (
              <div key={appt.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-ink-900">
                      {appt.patient?.person?.firstName} {appt.patient?.person?.lastNameP}
                    </p>
                    <p className="text-sm text-ink-600">
                      {formatDate(appt.startsAt)} - {formatTime(appt.startsAt)} a {formatTime(appt.endsAt)}
                    </p>
                    <p className="text-sm text-ink-500">
                      {appt.service?.name} &middot; {appt.branch?.name}
                    </p>
                    {appt.reason && (
                      <p className="text-sm text-ink-500 italic">Motivo: {appt.reason}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <select
                    className="input max-w-xs"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                  >
                    <option value="">Seleccionar ubicacion...</option>
                    {locs.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => confirmAppointment(appt.id)}
                    disabled={confirmingId === appt.id}
                    className="btn-primary"
                  >
                    {confirmingId === appt.id ? "Confirmando..." : "Confirmar cita"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
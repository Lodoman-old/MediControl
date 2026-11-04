import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";
import { appointmentStatusLabel } from "@/lib/roles";

interface PatientProfile {
  id: string;
  mrn: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  bloodType: string | null;
  emergencyContact: Record<string, string> | null;
  preferredLanguage: string;
  person: {
    firstName: string;
    lastNameP: string;
    lastNameM: string | null;
    birthDate: string;
    gender: string;
  };
}

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  reason: string | null;
  doctor?: { person?: { firstName: string; lastNameP: string } | null } | null;
  service?: { name: string } | null;
  serviceLocation?: { name: string } | null;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  indications: string | null;
  status: string;
  prescribedAt: string;
  doctor?: { person?: { firstName: string; lastNameP: string } | null } | null;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-success-100 text-success-700",
  CANCELED: "bg-ink-100 text-ink-500",
  NO_SHOW: "bg-warning-100 text-warning-700",
  SCHEDULED: "bg-info-100 text-info-700",
  PENDING_DOCTOR_CONFIRMATION: "bg-warning-100 text-warning-700",
  PAYMENT_PENDING_VALIDATION: "bg-warning-100 text-warning-700",
};

const GENDER_LABELS: Record<string, string> = {
  M: "Masculino",
  F: "Femenino",
  X: "Otro",
};

export default function PatientPortalPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"appointments" | "profile" | "prescriptions">("appointments");
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["patient", "me"],
    queryFn: async () => {
      const { data } = await api.get<PatientProfile>("/patients/me");
      return data;
    },
  });

  const appointmentsQuery = useQuery({
    queryKey: ["patient", "appointments"],
    queryFn: async () => {
      const { data } = await api.get<Appointment[]>("/appointments/me/list");
      return Array.isArray(data) ? data : [];
    },
  });

  const prescriptionsQuery = useQuery({
    queryKey: ["patient", "prescriptions", profileQuery.data?.id],
    queryFn: async () => {
      const { data } = await api.get<Prescription[]>(
        `/prescriptions/patient/${profileQuery.data!.id}`,
      );
      return data;
    },
    enabled: Boolean(profileQuery.data?.id),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/appointments/${id}/cancel`),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["patient", "appointments"] });
    },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const appointments = useMemo(
    () =>
      [...(appointmentsQuery.data ?? [])].sort(
        (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      ),
    [appointmentsQuery.data],
  );

  const profile = profileQuery.data;

  const downloadPrescription = async (id: string) => {
    try {
      const res = await api.get(`/prescriptions/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receta-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };

  if (profileQuery.isLoading) {
    return <p className="text-ink-500">Cargando tu portal...</p>;
  }

  if (profileQuery.error || !profile) {
    return (
      <div className="card bg-danger-50 border-danger-200">
        <p className="text-danger-700">
          {profileQuery.error
            ? extractErrorMessage(profileQuery.error)
            : "No se encontró tu perfil de paciente"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink-900">Mi portal</h2>
        <p className="text-sm text-ink-500 mt-1">
          Hola, {profile.person.firstName}. Aquí puedes consultar tus citas, tus datos y tus recetas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-ink-100">
        {[
          { key: "appointments", label: "Mis citas" },
          { key: "prescriptions", label: "Mis recetas" },
          { key: "profile", label: "Mi información" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as typeof tab)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
              tab === item.key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {tab === "appointments" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link to="/reservar" className="btn-primary text-sm">
              Reservar otra cita
            </Link>
          </div>

          {appointmentsQuery.isLoading ? (
            <div className="card text-ink-500">Cargando citas...</div>
          ) : appointments.length === 0 ? (
            <div className="card text-center space-y-2">
              <p className="text-ink-600">No tienes citas registradas.</p>
              <Link to="/reservar" className="text-sm text-primary-600 hover:text-primary-800">
                Reservar una cita
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => {
                const date = new Date(a.startsAt);
                const canCancel = ["SCHEDULED", "PENDING_DOCTOR_CONFIRMATION", "PAYMENT_PENDING_VALIDATION"].includes(
                  a.status,
                );
                const doctorName = a.doctor?.person
                  ? `${a.doctor.person.firstName} ${a.doctor.person.lastNameP}`
                  : "Médico por asignar";
                return (
                  <div key={a.id} className="card space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-ink-900">
                          {date.toLocaleDateString("es-MX", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-ink-600">
                          {date.toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {a.service?.name ? ` · ${a.service.name}` : ""}
                        </p>
                      </div>
                      <span
                        className={`badge ${
                          STATUS_STYLES[a.status] ?? "bg-ink-100 text-ink-600"
                        }`}
                      >
                        {appointmentStatusLabel(a.status)}
                      </span>
                    </div>
                    <p className="text-sm text-ink-600">
                      {doctorName}
                      {a.serviceLocation?.name ? ` · ${a.serviceLocation.name}` : ""}
                    </p>
                    {a.reason && <p className="text-xs text-ink-500">Motivo: {a.reason}</p>}
                    {canCancel && (
                      <button
                        className="text-sm text-danger-600 hover:text-danger-800 font-medium"
                        onClick={() => {
                          if (window.confirm("¿Cancelar esta cita?")) cancelMutation.mutate(a.id);
                        }}
                        disabled={cancelMutation.isPending}
                      >
                        Cancelar cita
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "prescriptions" && (
        <div className="space-y-3">
          {prescriptionsQuery.isLoading ? (
            <div className="card text-ink-500">Cargando recetas...</div>
          ) : (prescriptionsQuery.data ?? []).length === 0 ? (
            <div className="card text-ink-600">No tienes recetas registradas.</div>
          ) : (
            prescriptionsQuery.data!.map((p) => (
              <div key={p.id} className="card space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink-900">{p.medication}</p>
                    <p className="text-sm text-ink-600">
                      {p.dosage} · {p.frequency}
                      {p.duration ? ` · ${p.duration}` : ""}
                    </p>
                    {p.indications && (
                      <p className="text-xs text-ink-500 mt-1">Indicaciones: {p.indications}</p>
                    )}
                  </div>
                  <span className="badge bg-ink-100 text-ink-600">{p.status}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-ink-400">
                    {new Date(p.prescribedAt).toLocaleDateString("es-MX")}
                    {p.doctor?.person
                      ? ` · Dr. ${p.doctor.person.firstName} ${p.doctor.person.lastNameP}`
                      : ""}
                  </p>
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => downloadPrescription(p.id)}
                  >
                    Descargar PDF
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "profile" && (
        <div className="card space-y-3">
          <div>
            <p className="text-xs text-ink-400 uppercase tracking-wide">Paciente</p>
            <p className="text-lg font-semibold text-ink-900">{profile.fullName}</p>
            <p className="text-sm text-ink-500">Expediente: {profile.mrn}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-ink-400">Fecha de nacimiento</p>
              <p className="text-ink-900">
                {new Date(profile.person.birthDate).toLocaleDateString("es-MX")}
              </p>
            </div>
            <div>
              <p className="text-ink-400">Sexo</p>
              <p className="text-ink-900">
                {GENDER_LABELS[profile.person.gender] ?? profile.person.gender}
              </p>
            </div>
            <div>
              <p className="text-ink-400">Teléfono</p>
              <p className="text-ink-900">{profile.phone ?? "Sin registrar"}</p>
            </div>
            <div>
              <p className="text-ink-400">Correo</p>
              <p className="text-ink-900">{profile.email ?? "Sin registrar"}</p>
            </div>
            <div>
              <p className="text-ink-400">Tipo de sangre</p>
              <p className="text-ink-900">{profile.bloodType ?? "Sin registrar"}</p>
            </div>
            <div>
              <p className="text-ink-400">Idioma preferido</p>
              <p className="text-ink-900">{profile.preferredLanguage}</p>
            </div>
          </div>
          {profile.emergencyContact && (
            <div className="border-t border-ink-100 pt-3 text-sm">
              <p className="text-ink-400 mb-1">Contacto de emergencia</p>
              <p className="text-ink-900">
                {profile.emergencyContact.name ?? "—"}
                {profile.emergencyContact.phone ? ` · ${profile.emergencyContact.phone}` : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

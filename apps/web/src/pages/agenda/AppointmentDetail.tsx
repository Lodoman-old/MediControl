import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { appointmentStatusLabel } from "@/lib/roles";

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

interface LabOrder {
  id: string;
  studyType: string;
  studyName: string;
  indication: string | null;
  status: string;
  orderedAt: string;
}

interface AppointmentDetail {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  reason: string | null;
  channel: string;
  priceQuoted: string;
  currency: string;
  doctor: { id: string; person: { firstName: string; lastNameP: string; lastNameM: string | null } };
  patient: { id: string; person: { firstName: string; lastNameP: string; lastNameM: string | null }; mrn: string };
  service: { name: string };
  serviceLocation: { name: string } | null;
  branch: { name: string };
  vitalSigns?: any[];
}

const STATUS_ACTIONS: Record<string, { label: string; action: string; role: string }[]> = {
  SCHEDULED: [
    { label: "Registrar entrada", action: "check-in", role: "RECEPTION" },
  ],
  CHECKED_IN: [
    { label: "Iniciar consulta", action: "start-consult", role: "DOCTOR" },
    { label: "Marcar inasistencia", action: "no-show", role: "DOCTOR" },
  ],
  IN_TRIAGE: [
    { label: "Iniciar consulta", action: "start-consult", role: "DOCTOR" },
    { label: "Marcar inasistencia", action: "no-show", role: "DOCTOR" },
  ],
  IN_CONSULT: [
    { label: "Finalizar consulta", action: "complete-consult", role: "DOCTOR" },
  ],
};

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [appt, setAppt] = useState<AppointmentDetail | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.get(`/appointments/${id}`).then(({ data }) => {
      setAppt(data as any);
    }).catch((err) => {
      setError(extractErrorMessage(err));
    }).finally(() => setLoading(false));
  };

  const loadPrescriptions = () => {
    if (!appt) return;
    api.get(`/prescriptions/patient/${appt.patient.id}`).then(({ data }) => {
      setPrescriptions(data as any);
    }).catch(() => {});
  };

  const loadLabOrders = () => {
    if (!appt) return;
    api.get(`/clinical-records/${appt.patient.id}/lab-orders`).then(({ data }) => {
      setLabOrders(data as any);
    }).catch(() => {});
  };

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

  const downloadAllPrescriptionsPdf = async () => {
    if (!appt) return;
    try {
      const res = await api.get(`/prescriptions/patient/${appt.patient.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recetas-completas-${appt.patient.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const downloadLabOrderPdf = async (orderId: string) => {
    try {
      const res = await api.get(`/clinical-records/${appt!.patient.id}/lab-orders/${orderId}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `solicitud-estudio-${orderId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  useEffect(load, [id]);
  useEffect(loadPrescriptions, [appt?.patient.id]);
  useEffect(loadLabOrders, [appt?.patient.id]);

  const doAction = async (action: string) => {
    if (!id) return;
    setError(null);
    try {
      if (action === "check-in") {
        await api.patch(`/appointments/${id}`, { status: "CHECKED_IN" });
      } else {
        await api.patch(`/appointments/${id}/${action}`);
      }
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  if (loading) return <p className="text-ink-500">Cargando...</p>;
  if (error) return <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg"><p className="text-sm text-danger-700">{error}</p></div>;
  if (!appt) return <p className="text-ink-500">Cita no encontrada</p>;

  const patientName = `${appt.patient.person.firstName} ${appt.patient.person.lastNameP}${appt.patient.person.lastNameM ? " " + appt.patient.person.lastNameM : ""}`;
  const doctorName = `${appt.doctor.person.firstName} ${appt.doctor.person.lastNameP}`;
  const actions = STATUS_ACTIONS[appt.status]?.filter((a) => user?.roles.includes(a.role)) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate("/agenda")} className="text-sm text-primary-600 hover:text-primary-800">&larr; Volver a agenda</button>
      <h2 className="text-2xl font-semibold text-ink-900">Detalle de cita</h2>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className={`badge text-sm px-3 py-1 ${appt.status === "IN_CONSULT" ? "bg-indigo-100 text-indigo-700" : appt.status === "COMPLETED" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"}`}>
            {appointmentStatusLabel(appt.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-ink-400">Paciente</p>
            <p className="font-medium text-ink-900">{patientName}</p>
            <p className="text-ink-400 text-xs">MRN: {appt.patient.mrn}</p>
          </div>
          <div>
            <p className="text-ink-400">Medico</p>
            <p className="font-medium text-ink-900">{doctorName}</p>
          </div>
          <div>
            <p className="text-ink-400">Servicio</p>
            <p className="font-medium text-ink-900">{appt.service.name}</p>
          </div>
          <div>
            <p className="text-ink-400">Ubicacion</p>
            <p className="font-medium text-ink-900">{appt.serviceLocation?.name ?? appt.branch.name}</p>
          </div>
          <div>
            <p className="text-ink-400">Horario</p>
            <p className="font-medium text-ink-900">
              {new Date(appt.startsAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} - {new Date(appt.endsAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div>
            <p className="text-ink-400">Precio</p>
            <p className="font-medium text-ink-900">${appt.priceQuoted} {appt.currency}</p>
          </div>
        </div>

        {appt.reason && (
          <div>
            <p className="text-ink-400 text-sm">Motivo</p>
            <p className="text-ink-900">{appt.reason}</p>
          </div>
        )}
      </div>

      {actions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-ink-900 mb-3">Acciones</h3>
          <div className="flex flex-wrap gap-3">
            {actions.map((a) => (
              <button key={a.action} onClick={() => doAction(a.action)} className="btn-primary">
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold text-ink-900 mb-3">Expediente clinico</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate(`/expediente/${appt.patient.id}`)} className="btn-secondary">
            Ver expediente
          </button>
          <button onClick={() => navigate(`/expediente/${appt.patient.id}/notes/new?appointmentId=${appt.id}`)} className="btn-secondary">
            Agregar nota SOAP
          </button>
          <button onClick={() => navigate(`/expediente/${appt.patient.id}/diagnoses/new?appointmentId=${appt.id}`)} className="btn-secondary">
            Agregar diagnostico
          </button>
          <button onClick={() => navigate(`/expediente/${appt.patient.id}/treatments/new?appointmentId=${appt.id}`)} className="btn-secondary">
            Agregar tratamiento
          </button>
          <button onClick={() => navigate(`/expediente/${appt.patient.id}/prescriptions/new?appointmentId=${appt.id}`)} className="btn-secondary">
            Receta / prescripcion
          </button>
          <button onClick={() => navigate(`/expediente/${appt.patient.id}/consents/new?appointmentId=${appt.id}`)} className="btn-secondary">
            Consentimiento informado
          </button>
          <button onClick={() => navigate(`/expediente/${appt.patient.id}/lab-orders/new?appointmentId=${appt.id}`)} className="btn-secondary">
            Solicitar estudio
          </button>
        </div>
      </div>

      {prescriptions.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-ink-900">Recetas</h3>
            <button onClick={downloadAllPrescriptionsPdf} className="btn-secondary text-xs">
              Receta completa PDF
            </button>
          </div>
          <div className="space-y-2">
            {prescriptions.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-ink-200 pb-2">
                <div className="text-sm">
                  <p className="font-medium text-ink-900">{p.medication} - {p.dosage}</p>
                  <p className="text-ink-400 text-xs">{p.frequency} | {p.duration ?? ""} | {p.route ?? ""}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadPdf(p.id)}
                    className="btn-secondary text-xs"
                  >
                    PDF
                  </button>
                  {p.status === "ACTIVE" && (
                    <button
                      onClick={() => navigate(`/farmacia/pos?prescriptionId=${p.id}`)}
                      className="btn-primary text-xs"
                    >
                      Surtir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {labOrders.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-ink-900 mb-3">Estudios solicitados</h3>
          <div className="space-y-2">
            {labOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b border-ink-200 pb-2">
                <div className="text-sm">
                  <p className="font-medium text-ink-900">{o.studyName}</p>
                  <p className="text-ink-400 text-xs">{o.indication ?? ""}</p>
                </div>
                <button
                  onClick={() => downloadLabOrderPdf(o.id)}
                  className="btn-secondary text-xs"
                >
                  PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

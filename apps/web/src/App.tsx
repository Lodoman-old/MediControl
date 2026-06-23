import { Route, Routes, Navigate } from "react-router-dom";
import LoginPage from "@/pages/Login";
import ForgotPasswordPage from "@/pages/ForgotPassword";
import RegisterPage from "@/pages/Register";
import DashboardPage from "@/pages/Dashboard";
import ChangePasswordPage from "@/pages/ChangePassword";
import MfaSetupPage from "@/pages/MfaSetup";
import UsersListPage from "@/pages/admin/UsersList";
import UserFormPage from "@/pages/admin/UserForm";
import RolesListPage from "@/pages/admin/RolesList";
import RoleFormPage from "@/pages/admin/RoleForm";
import ServicesListPage from "@/pages/admin/ServicesList";
import LocationsListPage from "@/pages/admin/LocationsList";
import AgendaPage from "@/pages/agenda/Agenda";
import NewAppointmentPage from "@/pages/agenda/NewAppointment";
import DoctorConfirmationsPage from "@/pages/agenda/DoctorConfirmations";
import AppointmentDetailPage from "@/pages/agenda/AppointmentDetail";
import SchedulePage from "@/pages/schedule/Schedule";
import TriagePage from "@/pages/triage/Triage";
import RegisterPatientPage from "@/pages/pacientes/RegisterPatient";
import PatientListPage from "@/pages/expediente/PatientList";
import ExpedientePage from "@/pages/expediente/Expediente";
import NewNotePage from "@/pages/expediente/NewNote";
import NewDiagnosisPage from "@/pages/expediente/NewDiagnosis";
import NewTreatmentPage from "@/pages/expediente/NewTreatment";
import NewConsentPage from "@/pages/expediente/NewConsent";
import NewLabOrderPage from "@/pages/expediente/NewLabOrder";
import NewPrescriptionPage from "@/pages/expediente/NewPrescription";
import MedicalHistoryPage from "@/pages/expediente/MedicalHistory";
import PagosPage from "@/pages/pagos/Pagos";
import NewPaymentPage from "@/pages/pagos/NewPayment";
import FarmaciaPage from "@/pages/farmacia/Farmacia";
import POSPage from "@/pages/farmacia/POS";
import SalesHistoryPage from "@/pages/farmacia/SalesHistory";
import SalesReportPage from "@/pages/farmacia/SalesReport";
import InventoryAdjustmentPage from "@/pages/farmacia/InventoryAdjustment";
import CashRegisterPage from "@/pages/farmacia/CashRegister";
import ReportesPage from "@/pages/reportes/Reportes";
import ReportSchedulesPage from "@/pages/reportes/ReportSchedules";
import ProtectedLayout from "@/components/ProtectedLayout";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function App() {
  usePushNotifications();
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/mfa/setup"
        element={
          <ProtectedLayout>
            <MfaSetupPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedLayout>
            <UsersListPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <ProtectedLayout>
            <UserFormPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedLayout requiredRoles={["SUPERADMIN","ADMIN"]}>
            <RolesListPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/roles/new"
        element={
          <ProtectedLayout requiredRoles={["SUPERADMIN","ADMIN"]}>
            <RoleFormPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/roles/:id"
        element={
          <ProtectedLayout requiredRoles={["SUPERADMIN","ADMIN"]}>
            <RoleFormPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/servicios"
        element={
          <ProtectedLayout requiredRoles={["SUPERADMIN","ADMIN"]}>
            <ServicesListPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/ubicaciones"
        element={
          <ProtectedLayout requiredRoles={["SUPERADMIN","ADMIN"]}>
            <LocationsListPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/agenda"
        element={
          <ProtectedLayout>
            <AgendaPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/appointments/new"
        element={
          <ProtectedLayout>
            <NewAppointmentPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedLayout>
            <SchedulePage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/triage"
        element={
          <ProtectedLayout>
            <TriagePage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/appointments/pending"
        element={
          <ProtectedLayout>
            <DoctorConfirmationsPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/appointments/:id"
        element={
          <ProtectedLayout>
            <AppointmentDetailPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/patients/new"
        element={
          <ProtectedLayout requiredRoles={["SUPERADMIN","ADMIN","RECEPTION"]}>
            <RegisterPatientPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/expediente"
        element={
          <ProtectedLayout>
            <PatientListPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/expediente/:patientId"
        element={
          <ProtectedLayout>
            <ExpedientePage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/expediente/:patientId/notes/new"
        element={
          <ProtectedLayout>
            <NewNotePage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/expediente/:patientId/diagnoses/new"
        element={
          <ProtectedLayout>
            <NewDiagnosisPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/expediente/:patientId/treatments/new"
        element={
          <ProtectedLayout>
            <NewTreatmentPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/expediente/:patientId/consents/new"
        element={
          <ProtectedLayout>
            <NewConsentPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/expediente/:patientId/lab-orders/new"
        element={
          <ProtectedLayout>
            <NewLabOrderPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/expediente/:patientId/prescriptions/new"
        element={
          <ProtectedLayout>
            <NewPrescriptionPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/expediente/:patientId/history"
        element={
          <ProtectedLayout>
            <MedicalHistoryPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/pagos"
        element={
          <ProtectedLayout>
            <PagosPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/pagos/nuevo"
        element={
          <ProtectedLayout>
            <NewPaymentPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/farmacia"
        element={
          <ProtectedLayout>
            <FarmaciaPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/farmacia/pos"
        element={
          <ProtectedLayout>
            <POSPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/farmacia/ventas"
        element={
          <ProtectedLayout>
            <SalesHistoryPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/farmacia/reporte-ventas"
        element={
          <ProtectedLayout>
            <SalesReportPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/farmacia/ajustes"
        element={
          <ProtectedLayout>
            <InventoryAdjustmentPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/farmacia/caja"
        element={
          <ProtectedLayout>
            <CashRegisterPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedLayout>
            <ReportesPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reportes/programados"
        element={
          <ProtectedLayout>
            <ReportSchedulesPage />
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

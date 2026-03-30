import { Route, Navigate, useLocation } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import PatientAppointmentsPage from "../pages/appointments/patientAppointments";
import DoctorAppointmentsPage from "../pages/appointments/doctorAppointments";
import DoctorAppointmentRequestsPage from "../pages/appointments/appointmentRequests";
import CreateAppointmentPage from "../pages/appointments/createAppointment";
import RequireTelemedicineRole from "../components/telemedicine/RequireTelemedicineRole";
import {
  getRoleHomePath,
  getStoredTelemedicineAuth,
} from "../utils/telemedicineAuth";

function AppointmentRoleRedirect() {
  const auth = getStoredTelemedicineAuth();
  const location = useLocation();

  if (!auth.role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (auth.role === "doctor") {
    return (
      <Navigate
        to="/appointments/doctor"
        replace
        state={{ from: location }}
      />
    );
  }

  if (auth.role === "patient") {
    return (
      <Navigate
        to="/appointments/patient"
        replace
        state={{ from: location }}
      />
    );
  }

  return (
    <Navigate
      to={getRoleHomePath(auth.role)}
      replace
      state={{ from: location }}
    />
  );
}

export const appointmentRoutes = (
  <>
    <Route
      path="/appointments"
      element={
        <MainLayout>
          <AppointmentRoleRedirect />
        </MainLayout>
      }
    />

    <Route
      path="/appointments/patient"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["patient"]}>
            <PatientAppointmentsPage />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/appointments/doctor"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <DoctorAppointmentsPage />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/appointments/requests"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <DoctorAppointmentRequestsPage />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/appointments/create"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["patient"]}>
            <CreateAppointmentPage />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />
  </>
);
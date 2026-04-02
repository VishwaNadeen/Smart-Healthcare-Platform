import { Route, Navigate, useLocation } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import FullScreenLayout from "../layouts/fullScreenLayout";

import RequireTelemedicineRole from "../components/telemedicine/RequireTelemedicineRole";
import { getStoredTelemedicineAuth } from "../utils/telemedicineAuth";

import Consultation from "../pages/telemedicine/consultation";
import DoctorSessions from "../pages/telemedicine/doctorsessions";
import PatientSessions from "../pages/telemedicine/patientsessions";
import DoctorWaitingRoom from "../pages/telemedicine/doctorWaitingRoom";
import PatientWaitingRoom from "../pages/telemedicine/patientWaitingRoom";
import DoctorSessionSummary from "../pages/telemedicine/doctorSessionSummary";
import SessionSummary from "../pages/telemedicine/sessionsummary";
import SessionHistory from "../pages/telemedicine/sessionHistory";

function ConsultationRedirect() {
  const auth = getStoredTelemedicineAuth();
  const location = useLocation();

  if (!auth.role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (auth.role === "doctor") {
    return (
      <Navigate
        to="/doctor-sessions"
        replace
        state={{ from: location }}
      />
    );
  }

  if (auth.role === "patient") {
    return (
      <Navigate
        to="/patient-sessions"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Navigate to="/" replace state={{ from: location }} />;
}

export const telemedicineRoutes = (
  <>
    <Route
      path="/consultation"
      element={
        <MainLayout>
          <ConsultationRedirect />
        </MainLayout>
      }
    />

    <Route
      path="/consultation/doctor"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <DoctorSessions />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/consultation/patient"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["patient"]}>
            <PatientSessions />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/doctor-sessions"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <DoctorSessions />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/patient-sessions"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["patient"]}>
            <PatientSessions />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/doctor-waiting-room/:appointmentId"
      element={
        <FullScreenLayout>
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <DoctorWaitingRoom />
          </RequireTelemedicineRole>
        </FullScreenLayout>
      }
    />

    <Route
      path="/patient-waiting-room/:appointmentId"
      element={
        <FullScreenLayout>
          <RequireTelemedicineRole allowedRoles={["patient"]}>
            <PatientWaitingRoom />
          </RequireTelemedicineRole>
        </FullScreenLayout>
      }
    />

    <Route
      path="/consultation/:appointmentId"
      element={
        <FullScreenLayout>
          <RequireTelemedicineRole allowedRoles={["doctor", "patient"]}>
            <Consultation />
          </RequireTelemedicineRole>
        </FullScreenLayout>
      }
    />

    <Route
      path="/session-summary/:appointmentId"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor", "patient"]}>
            <SessionSummary />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/doctor-session-summary/:appointmentId"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <DoctorSessionSummary />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/session-history"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <SessionHistory />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

  </>
);

import { Route, Navigate, useLocation } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import FullScreenLayout from "../layouts/fullScreenLayout";

import RequireTelemedicineRole from "../components/telemedicine/RequireTelemedicineRole";
import { getStoredTelemedicineAuth } from "../utils/telemedicineAuth";

import Consultation from "../pages/telemedicine/consultation";
import DoctorSessions from "../pages/telemedicine/doctorsessions";
import PatientSessions from "../pages/telemedicine/Patientsessions";
import SessionDetails from "../pages/telemedicine/sessiondetails";
import WaitingRoom from "../pages/telemedicine/waitingroom";
import SessionSummary from "../pages/telemedicine/sessionsummary";
import SessionHistory from "../pages/telemedicine/sessionHistory";
import Dashboard from "../pages/telemedicine/dashboard";
import Statistics from "../pages/telemedicine/statistics";

function ConsultationRedirect() {
  const auth = getStoredTelemedicineAuth();
  const location = useLocation();

  if (!auth.role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (auth.role === "doctor") {
    return (
      <Navigate
        to="/consultation/doctor"
        replace
        state={{ from: location }}
      />
    );
  }

  if (auth.role === "patient") {
    return (
      <Navigate
        to="/consultation/patient"
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
      path="/session/:appointmentId"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor", "patient"]}>
            <SessionDetails />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/waiting-room/:appointmentId"
      element={
        <FullScreenLayout>
          <RequireTelemedicineRole allowedRoles={["doctor", "patient"]}>
            <WaitingRoom />
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
      path="/session-history"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["patient"]}>
            <SessionHistory />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/telemedicine-dashboard"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor", "patient"]}>
            <Dashboard />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/telemedicine-statistics"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor", "patient"]}>
            <Statistics />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />
  </>
);
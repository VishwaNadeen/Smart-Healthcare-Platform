import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/home/homePage";
import MainLayout from "../layouts/mainLayout";
import FullScreenLayout from "../layouts/fullScreenLayout";

import Consultation from "../pages/telemedicine/consultation";
import DoctorSessions from "../pages/telemedicine/doctorsessions";
import PatientSessions from "../pages/telemedicine/Patientsessions";
import SessionDetails from "../pages/telemedicine/sessiondetails";
import WaitingRoom from "../pages/telemedicine/waitingroom";
import SessionSummary from "../pages/telemedicine/sessionsummary";
import SessionHistory from "../pages/telemedicine/sessionHistory";
import Dashboard from "../pages/telemedicine/dashboard";
import Statistics from "../pages/telemedicine/statistics";

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <MainLayout>
            <HomePage />
          </MainLayout>
        }
      />

      <Route
        path="/doctor-sessions"
        element={
          <MainLayout>
            <DoctorSessions />
          </MainLayout>
        }
      />

      <Route
        path="/patient-sessions"
        element={
          <MainLayout>
            <PatientSessions />
          </MainLayout>
        }
      />

      <Route
        path="/session/:appointmentId"
        element={
          <MainLayout>
            <SessionDetails />
          </MainLayout>
        }
      />

      <Route
        path="/waiting-room/:appointmentId"
        element={
          <FullScreenLayout>
            <WaitingRoom />
          </FullScreenLayout>
        }
      />

      <Route
        path="/consultation/:appointmentId"
        element={
          <FullScreenLayout>
            <Consultation />
          </FullScreenLayout>
        }
      />

      <Route
        path="/session-summary/:appointmentId"
        element={
          <MainLayout>
            <SessionSummary />
          </MainLayout>
        }
      />

      <Route
        path="/session-history"
        element={
          <MainLayout>
            <SessionHistory />
          </MainLayout>
        }
      />

      <Route
      path="/telemedicine-dashboard"
      element={
        <MainLayout>
          <Dashboard />
        </MainLayout>
      }
    />

    <Route
      path="/telemedicine-statistics"
      element={
        <MainLayout>
          <Statistics />
        </MainLayout>
      }
    />
    </Routes>
  );
}

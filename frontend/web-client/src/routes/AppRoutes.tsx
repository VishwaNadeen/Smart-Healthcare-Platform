import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/home/homePage";
import MainLayout from "../layouts/mainLayout";
import FullScreenLayout from "../layouts/fullScreenLayout";

import Consultation from "../pages/telemedicine/consultation";
import DoctorSessions from "../pages/telemedicine/doctorSessions";
import PatientSessions from "../pages/telemedicine/Patientsessions";
import SessionDetails from "../pages/telemedicine/sessionDetails";
import WaitingRoom from "../pages/telemedicine/waitingRoom";
import SessionSummary from "../pages/telemedicine/sessionSummary";

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
    </Routes>
  );
}

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
      <Route element={<AuthRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        path="/"
        element={
          <MainLayout>
            <HomePage />
          </MainLayout>
        }
      />
      {telemedicineRoutes}
    </Routes>
  );
}
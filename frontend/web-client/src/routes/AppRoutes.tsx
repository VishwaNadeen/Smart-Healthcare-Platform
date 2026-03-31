import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/home/homePage";
import LoginPage from "../pages/auth/login";
import MainLayout from "../layouts/mainLayout";

import { telemedicineRoutes } from "./telemedicineRoutes";
import { patientRoutes } from "./patientRoutes";
import { appointmentRoutes } from "./appointmentRoutes";
import { doctorRoutes } from "./doctorRoutes";
import VerifyEmailPage from "../pages/auth/VerifyEmail";

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
        path="/login"
        element={
          <MainLayout>
            <LoginPage />
          </MainLayout>
        }
      />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {telemedicineRoutes}
      {patientRoutes}
      {doctorRoutes}
      {appointmentRoutes}
    </Routes>
  );
}

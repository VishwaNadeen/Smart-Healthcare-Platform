import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/home/homePage";
import LoginPage from "../pages/auth/login";
import VerifyEmailPage from "../pages/auth/VerifyEmail";
import MainLayout from "../layouts/mainLayout";

import { telemedicineRoutes } from "./telemedicineRoutes";
import { patientRoutes } from "./patientRoutes";
import { appointmentRoutes } from "./appointmentRoutes";
import { profileRoutes } from "./profileRoutes";

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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
     
      {telemedicineRoutes}
      {patientRoutes}
      {appointmentRoutes}
      {profileRoutes}
    </Routes>
  );
}

import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/home/homePage";
import LoginPage from "../pages/auth/login";
import MainLayout from "../layouts/mainLayout";

import { telemedicineRoutes } from "./telemedicineRoutes";
import { patientRoutes } from "./patientRoutes";
import { appointmentRoutes } from "./appointmentRoutes";
import VerifyEmailPage from "../pages/auth/VerifyEmail";
import ForgotPasswordPage from "../pages/auth/ForgotPassword";

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
    </Routes>
  );
}

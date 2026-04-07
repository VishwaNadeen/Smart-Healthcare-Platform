import { Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import HomePage from "../pages/home/homePage";
import LoginPage from "../pages/auth/login";
import VerifyEmailPage from "../pages/auth/VerifyEmail";
import ForgotPasswordPage from "../pages/auth/ForgotPassword";
import MainLayout from "../layouts/mainLayout";

import { aboutRoutes } from "./aboutRoute";
import { contactRoutes } from "./contactRoute";

import { telemedicineRoutes } from "./telemedicineRoutes";
import { patientRoutes } from "./patientRoutes";
import { appointmentRoutes } from "./appointmentRoutes";
import { doctorRoutes } from "./doctorRoutes";
import { profileRoutes } from "./profileRoutes";
import { prescriptionRoutes } from "./prescriptionRoutes";

export default function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
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

        {aboutRoutes}
        {contactRoutes}

        {telemedicineRoutes}
        {patientRoutes}
        {doctorRoutes}
        {appointmentRoutes}
        {profileRoutes}
        {prescriptionRoutes}
      </Routes>
    </AnimatePresence>
  );
}

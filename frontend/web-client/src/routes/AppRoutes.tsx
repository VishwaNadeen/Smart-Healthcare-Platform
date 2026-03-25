import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/home/homePage";
import MainLayout from "../layouts/mainLayout";
import Consultation from "../pages/consultation/consultation";
import DoctorSessions from "../pages/consultation/doctorSessions";
import PatientSessions from "../pages/consultation/PatientSessions";

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
        path="/consultation/:appointmentId"
        element={
          <MainLayout>
            <Consultation />
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
    </Routes>
  );
}
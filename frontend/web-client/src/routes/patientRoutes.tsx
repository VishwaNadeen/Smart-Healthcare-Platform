import { Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import PatientRegister from "../pages/patient/Register";
import PatientProfile from "../pages/patient/Profile";

export const patientRoutes = (
  <>
    <Route
      path="/register"
      element={
        <MainLayout>
          <PatientRegister />
        </MainLayout>
      }
    />

    <Route
      path="/signup"
      element={
        <MainLayout>
          <PatientRegister />
        </MainLayout>
      }
    />

    <Route
      path="/patient/register"
      element={
        <MainLayout>
          <PatientRegister />
        </MainLayout>
      }
    />

    <Route
      path="/patient/profile"
      element={
        <MainLayout>
          <PatientProfile />
        </MainLayout>
      }
    />
  </>
);

import { Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import DoctorRegisterPage from "../pages/doctor/Register";
import DoctorProfilePage from "../pages/doctor/Profile";

export const doctorRoutes = (
  <>
    <Route
      path="/doctor/register"
      element={
        <MainLayout>
          <DoctorRegisterPage />
        </MainLayout>
      }
    />

    <Route
      path="/doctor/profile"
      element={
        <MainLayout>
          <DoctorProfilePage />
        </MainLayout>
      }
    />
  </>
);

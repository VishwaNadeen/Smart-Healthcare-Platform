import { Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import DoctorRegisterPage from "../pages/doctor/Register";
import DoctorProfilePage from "../pages/doctor/Profile";
import DoctorAvailabilityPage from "../pages/doctor/Availability";
import RequireTelemedicineRole from "../components/telemedicine/RequireTelemedicineRole";

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
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <DoctorProfilePage />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/doctor/availability"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <DoctorAvailabilityPage />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />
  </>
);

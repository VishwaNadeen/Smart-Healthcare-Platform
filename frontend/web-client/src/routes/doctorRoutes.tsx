import { Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import RequireTelemedicineRole from "../components/telemedicine/RequireTelemedicineRole";
import DoctorRegisterPage from "../pages/doctor/Register";
import DoctorAvailabilityPage from "../pages/doctor/Availability";
import DoctorProfile from "../pages/doctor/Profile";

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
            <DoctorProfile />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/availability"
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

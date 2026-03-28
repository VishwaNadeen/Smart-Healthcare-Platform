import { Route, Navigate, useLocation } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import RequireTelemedicineRole from "../components/telemedicine/RequireTelemedicineRole";
import { getStoredTelemedicineAuth } from "../utils/telemedicineAuth";

import PatientProfile from "../pages/patient/Profile";
import DoctorProfile from "../pages/doctor/doctorProfile";

function ProfileRedirect() {
  const auth = getStoredTelemedicineAuth();
  const location = useLocation();

  if (!auth.role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (auth.role === "doctor") {
    return <Navigate to="/profile/doctor" replace state={{ from: location }} />;
  }

  if (auth.role === "patient") {
    return <Navigate to="/profile/patient" replace state={{ from: location }} />;
  }

  return <Navigate to="/" replace state={{ from: location }} />;
}

export const profileRoutes = (
  <>
    <Route
      path="/profile"
      element={
        <MainLayout>
          <ProfileRedirect />
        </MainLayout>
      }
    />

    <Route
      path="/profile/doctor"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <DoctorProfile />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/profile/patient"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["patient"]}>
            <PatientProfile />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />
  </>
);
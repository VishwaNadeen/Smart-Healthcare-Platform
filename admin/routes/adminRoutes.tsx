import { Route } from "react-router-dom";
import AdminLayout from "../components/layout/AdminLayout";
import RequireAdminAuth from "../src/components/auth/RequireAdminAuth";
import AdminDashboard from "../pages/dashboard/AdminDashboard";
import AdminAppointments from "../pages/appointments/AdminAppointments";
import AdminDoctorVerifications from "../pages/doctor-verifications/AdminDoctorVerifications";
import AdminPayments from "../pages/payments/AdminPayments";
import AdminOperations from "../pages/operations/AdminOperations";
import AdminUsers from "../pages/users/AdminUsers";

export const adminRoutes = (
  <>
    <Route
      path="/"
      element={
        <RequireAdminAuth>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </RequireAdminAuth>
      }
    />
    <Route
      path="/users"
      element={
        <RequireAdminAuth>
          <AdminLayout>
            <AdminUsers />
          </AdminLayout>
        </RequireAdminAuth>
      }
    />
    <Route
      path="/doctor-verifications"
      element={
        <RequireAdminAuth>
          <AdminLayout>
            <AdminDoctorVerifications />
          </AdminLayout>
        </RequireAdminAuth>
      }
    />
    <Route
      path="/appointments"
      element={
        <RequireAdminAuth>
          <AdminLayout>
            <AdminAppointments />
          </AdminLayout>
        </RequireAdminAuth>
      }
    />
    <Route
      path="/payments"
      element={
        <RequireAdminAuth>
          <AdminLayout>
            <AdminPayments />
          </AdminLayout>
        </RequireAdminAuth>
      }
    />
    <Route
      path="/operations"
      element={
        <RequireAdminAuth>
          <AdminLayout>
            <AdminOperations />
          </AdminLayout>
        </RequireAdminAuth>
      }
    />
  </>
);

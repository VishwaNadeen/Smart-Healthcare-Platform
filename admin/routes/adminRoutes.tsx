import { Route } from "react-router-dom";
import AdminLayout from "../components/layout/AdminLayout";
import RequireAdminAuth from "../src/components/auth/RequireAdminAuth";
import AdminDashboard from "../pages/dashboard/AdminDashboard";
import AdminSessions from "../pages/sessions/AdminSessions";
import AdminPrescriptions from "../pages/prescriptions/AdminPrescriptions";
import AdminFiles from "../pages/files/AdminFiles";
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
      path="/sessions"
      element={
        <RequireAdminAuth>
          <AdminLayout>
            <AdminSessions />
          </AdminLayout>
        </RequireAdminAuth>
      }
    />
    <Route
      path="/prescriptions"
      element={
        <RequireAdminAuth>
          <AdminLayout>
            <AdminPrescriptions />
          </AdminLayout>
        </RequireAdminAuth>
      }
    />
    <Route
      path="/files"
      element={
        <RequireAdminAuth>
          <AdminLayout>
            <AdminFiles />
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
  </>
);

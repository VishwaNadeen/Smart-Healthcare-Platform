import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../components/layout/AdminLayout";
import AdminDashboard from "../pages/dashboard/AdminDashboard";
import AdminSessions from "../pages/sessions/AdminSessions";
import AdminPrescriptions from "../pages/prescriptions/AdminPrescriptions";
import AdminFiles from "../pages/files/AdminFiles";
import AdminUsers from "../pages/users/AdminUsers";

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        }
      />
      <Route
        path="/sessions"
        element={
          <AdminLayout>
            <AdminSessions />
          </AdminLayout>
        }
      />
      <Route
        path="/prescriptions"
        element={
          <AdminLayout>
            <AdminPrescriptions />
          </AdminLayout>
        }
      />
      <Route
        path="/files"
        element={
          <AdminLayout>
            <AdminFiles />
          </AdminLayout>
        }
      />
      <Route
        path="/users"
        element={
          <AdminLayout>
            <AdminUsers />
          </AdminLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
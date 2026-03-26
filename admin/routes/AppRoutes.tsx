import { Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "../pages/auth/AdminLogin";
import { adminRoutes } from "./adminRoutes";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      {adminRoutes}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

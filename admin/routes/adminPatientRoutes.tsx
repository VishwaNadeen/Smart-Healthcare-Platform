import { Route } from "react-router-dom";
import AdminUsersPage from "../pages/users/AdminUsers";

export const adminPatientRoutes = (
  <>
    <Route path="/admin/users" element={<AdminUsersPage />} />
  </>
);
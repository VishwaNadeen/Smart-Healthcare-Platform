import { Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import LoginPage from "../pages/auth/loginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import HomePage from "../pages/home/homePage";
import AuthRoute from "./authRoute";
import { telemedicineRoutes } from "./telemedicineRoutes";

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <MainLayout>
            <HomePage />
          </MainLayout>
        }
      />

      <Route element={<AuthRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/signup" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {telemedicineRoutes}
    </Routes>
  );
}

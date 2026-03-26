import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/home/homePage";
import LoginPage from "../pages/auth/loginPage";
import MainLayout from "../layouts/mainLayout";

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
      <Route
        path="/login"
        element={
          <MainLayout>
            <LoginPage />
          </MainLayout>
        }
      />
      {telemedicineRoutes}
    </Routes>
  );
}

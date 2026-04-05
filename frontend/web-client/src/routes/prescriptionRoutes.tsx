import { Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import PrescriptionsPage from "../pages/prescriptions/PrescriptionsPage";

export const prescriptionRoutes = [
  <Route
    key="prescriptions"
    path="/prescriptions"
    element={
      <MainLayout>
        <PrescriptionsPage />
      </MainLayout>
    }
  />,
  <Route
    key="appointment-prescriptions"
    path="/prescriptions/appointment/:appointmentId"
    element={
      <MainLayout>
        <PrescriptionsPage />
      </MainLayout>
    }
  />,
];

import { Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import DoctorRegisterPage from "../pages/doctor/Register";

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
  </>
);

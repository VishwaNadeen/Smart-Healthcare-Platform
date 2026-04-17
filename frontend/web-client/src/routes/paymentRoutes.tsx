import { Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import RequireTelemedicineRole from "../components/telemedicine/RequireTelemedicineRole";
import PaymentCheckoutPage from "../pages/payment/PaymentCheckout";
import PaymentSuccessPage from "../pages/payment/PaymentSuccess";
import PaymentCancelPage from "../pages/payment/PaymentCancel";
import PaymentHistoryPage from "../pages/payment/PaymentHistory";
import NotificationHistoryPage from "../pages/notifications/NotificationHistory";
import DoctorEarningsPage from "../pages/payment/DoctorEarnings";

export const paymentRoutes = (
  <>
    <Route
      path="/payment/checkout"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["patient"]}>
            <PaymentCheckoutPage />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/payment/success"
      element={
        <MainLayout>
          <PaymentSuccessPage />
        </MainLayout>
      }
    />

    <Route
      path="/payment/cancel"
      element={
        <MainLayout>
          <PaymentCancelPage />
        </MainLayout>
      }
    />

    <Route
      path="/payment/history"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["patient", "doctor"]}>
            <PaymentHistoryPage />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/notifications"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["patient", "doctor"]}>
            <NotificationHistoryPage />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />

    <Route
      path="/earnings"
      element={
        <MainLayout>
          <RequireTelemedicineRole allowedRoles={["doctor"]}>
            <DoctorEarningsPage />
          </RequireTelemedicineRole>
        </MainLayout>
      }
    />
  </>
);

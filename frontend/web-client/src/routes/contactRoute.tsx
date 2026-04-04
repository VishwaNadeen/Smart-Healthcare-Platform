import { Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import ContactPage from "../pages/contact/contactPage";

export const contactRoutes = (
  <>
    <Route
      path="/contact"
      element={
        <MainLayout>
          <ContactPage />
        </MainLayout>
      }
    />
  </>
);
import { Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import AboutPage from "../pages/about/aboutPage";

export const aboutRoutes = (
  <>
    <Route
      path="/about"
      element={
        <MainLayout>
          <AboutPage />
        </MainLayout>
      }
    />
  </>
);
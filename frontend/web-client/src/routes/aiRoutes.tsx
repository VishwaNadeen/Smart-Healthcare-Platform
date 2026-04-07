import { Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";

import SymptomCheckDetails from "../pages/ai/SymptomCheckDetails";
import SymptomHistoryPage from "../pages/ai/SymptomHistoryPage";
import SymptomCheckerPage from "../pages/ai/SymptomCheckerPage";

export const aiRoutes = (
  <>
    <Route
      path="/ai"
      element={
        <MainLayout>
          <SymptomCheckerPage />
        </MainLayout>
      }
    />

    <Route
      path="/ai/history"
      element={
        <MainLayout>
          <SymptomHistoryPage />
        </MainLayout>
      }
    />

    <Route
      path="/ai/check/:id"
      element={
        <MainLayout>
          <SymptomCheckDetails />
        </MainLayout>
      }
    />
  </>
);
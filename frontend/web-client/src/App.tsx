import AppRoutes from "./routes/AppRoutes";
import { ToastProvider } from "./components/common/ToastProvider";

export default function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}

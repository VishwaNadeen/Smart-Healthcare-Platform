import { Navigate, Outlet } from "react-router-dom";
import {
  getRoleHomePath,
  getStoredTelemedicineAuth,
} from "../utils/telemedicineAuth";

export default function AuthRoute() {
  const auth = getStoredTelemedicineAuth();

  if (auth.isAuthenticated) {
    return <Navigate to={getRoleHomePath(auth.role)} replace />;
  }

  return <Outlet />;
}



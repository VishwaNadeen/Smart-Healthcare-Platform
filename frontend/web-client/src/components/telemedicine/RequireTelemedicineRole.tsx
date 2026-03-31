import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import TelemedicineAccessNotice from "./TelemedicineAccessNotice";
import {
  getRoleHomePath,
  getStoredTelemedicineAuth,
  type TelemedicineRole,
} from "../../utils/telemedicineAuth";

type RequireTelemedicineRoleProps = {
  allowedRoles: TelemedicineRole[];
  children: ReactNode;
};

export default function RequireTelemedicineRole({
  allowedRoles,
  children,
}: RequireTelemedicineRoleProps) {
  const auth = getStoredTelemedicineAuth();
  const location = useLocation();

  if (!auth.role) {
    return (
      <TelemedicineAccessNotice
        title="Telemedicine sign-in required"
        description="This page needs a real login session. Sign in to load your doctor or patient role from the backend."
        actionLabel="Go to Login"
        actionTo="/login"
        actionState={{ from: location }}
      />
    );
  }

  if (!allowedRoles.includes(auth.role)) {
    return (
      <Navigate
        to={getRoleHomePath(auth.role)}
        replace
        state={{ from: location }}
      />
    );
  }

  return <>{children}</>;
}

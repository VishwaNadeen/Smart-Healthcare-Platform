import { Navigate, useLocation } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "../../context/AuthContext";

export default function RequireAdminAuth({
  children,
}: {
  children: ReactElement;
}) {
  const { auth, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <p className="rounded-full border border-slate-700 px-5 py-2 text-sm tracking-[0.2em] uppercase">
          Loading admin session
        </p>
      </div>
    );
  }

  if (!auth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

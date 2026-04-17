import type { ReactNode } from "react";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

type RequirePatientProps = {
  children: ReactNode;
};

export default function RequirePatient({ children }: RequirePatientProps) {
  const auth = getStoredTelemedicineAuth();
  const role = String(auth?.role || "").toLowerCase();
  const isPatient = role === "patient";

  if (!isPatient) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
          Only patients can access the AI Symptom Checker.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
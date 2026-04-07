import { useState } from "react";
import { Link } from "react-router-dom";

export default function NoPendingAppointments() {
  const [hasAnimationError, setHasAnimationError] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-14rem)] w-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl text-center">
        {!hasAnimationError && (
          <div className="mx-auto mb-6 flex h-64 w-full max-w-md items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-50 via-white to-slate-100 shadow-inner sm:h-72">
            <div className="text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-4xl font-bold text-blue-600 shadow-sm">
                AP
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500 sm:text-base">
                Patient appointments are clear right now.
              </p>
              <button
                type="button"
                onClick={() => setHasAnimationError(true)}
                className="sr-only"
              >
                Hide illustration
              </button>
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          No pending appointments found
        </h2>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">
          You do not have any pending appointment requests right now. Create a
          new appointment to connect with a doctor.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/appointments/create"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Create Appointment
          </Link>

          <Link
            to="/appointments/history"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View Canceled Appointments
          </Link>
        </div>
      </div>
    </div>
  );
}

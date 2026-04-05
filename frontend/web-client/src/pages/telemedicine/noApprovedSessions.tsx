import { useState } from "react";
import { Link } from "react-router-dom";

type Props = {
  appointmentLink?: string;
};

function EmptyStateVisual() {
  const [hasAnimationError, setHasAnimationError] = useState(false);

  return (
    <div className="flex h-[180px] w-full max-w-[300px] items-center justify-center sm:h-[220px] sm:max-w-[360px]">
      {hasAnimationError ? (
        <div className="text-center">
          <div className="text-4xl font-bold tracking-tight text-blue-600 sm:text-5xl">
            DR
          </div>
          <p className="mt-3 text-sm font-medium text-slate-500 sm:text-base">
            No approved sessions available right now.
          </p>
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-[24px] bg-gradient-to-br from-blue-50 via-white to-slate-100 shadow-inner"
          aria-label="No approved sessions animation"
        >
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-4xl font-bold text-blue-600 shadow-sm">
              DR
            </div>
            <p className="mt-5 px-4 text-sm font-medium text-slate-500 sm:text-base">
              No approved doctor sessions yet.
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
    </div>
  );
}

export default function NoApprovedSessions({
  appointmentLink = "/appointments/doctor",
}: Props) {
  return (
    <div className="flex min-h-[calc(100vh-14rem)] w-full items-center justify-center px-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <EmptyStateVisual />

        <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          No approved sessions yet
        </h2>

        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
          You do not have any approved consultation sessions right now. Once an
          appointment is approved, it will appear here automatically.
        </p>

        <div className="mt-8 flex w-full justify-center">
          <Link
            to={appointmentLink}
            className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Go to Appointments
          </Link>
        </div>
      </div>
    </div>
  );
}

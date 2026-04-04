import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import lottie from "lottie-web";
import patientEmptyState from "../../assets/animations/patient-empty-state.json";

function cloneAnimationData<T>(data: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data)) as T;
}

export default function NoPendingAppointments() {
  const animationRef = useRef<HTMLDivElement | null>(null);
  const [hasAnimationError, setHasAnimationError] = useState(false);

  useEffect(() => {
    if (!animationRef.current) {
      return;
    }

    const animation = lottie.loadAnimation({
      container: animationRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: cloneAnimationData(patientEmptyState),
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
      },
    });

    const handleError = () => {
      setHasAnimationError(true);
    };

    animation.addEventListener("data_failed", handleError);

    return () => {
      animation.removeEventListener("data_failed", handleError);
      animation.destroy();
    };
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-14rem)] w-full items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl text-center">
        {!hasAnimationError && (
          <div className="mx-auto mb-6 h-64 w-full max-w-md sm:h-72">
            <div ref={animationRef} className="h-full w-full" />
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

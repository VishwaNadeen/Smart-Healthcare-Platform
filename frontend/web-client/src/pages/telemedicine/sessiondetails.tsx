import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import { PATIENT_API_URL } from "../../config/api";
import {
  getSessionByAppointmentId,
  type TelemedicineSession,
  updateSessionStatus,
} from "../../services/telemedicineApi";
import {
  canAccessTelemedicineSession,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

type PatientProfile = {
  _id: string;
  firstName?: string;
  lastName?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { message?: string; error?: string })
    | null;

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  if (data === null) {
    throw new Error("Empty response received from service");
  }

  return data as T;
}

export default function SessionDetails() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const auth = getStoredTelemedicineAuth();

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      if (!appointmentId) {
        setError("Appointment ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        setPatientProfile(null);
        const data = await getSessionByAppointmentId(appointmentId);

        if (isMounted) {
          setSession(data);
        }
      } catch (err) {
        console.error("Failed to load session details:", err);
        if (isMounted) {
          setError("Failed to load session details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [appointmentId]);

  useEffect(() => {
    let isMounted = true;

    async function loadPatientProfile() {
      if (!session?.patientId) {
        return;
      }

      try {
        const response = await fetch(`${PATIENT_API_URL}/${session.patientId}`);
        const patient = await parseResponse<PatientProfile>(response);

        if (isMounted) {
          setPatientProfile(patient);
        }
      } catch {
        if (isMounted) {
          setPatientProfile(null);
        }
      }
    }

    loadPatientProfile();

    return () => {
      isMounted = false;
    };
  }, [session]);

  async function handleStartSession() {
    if (!appointmentId || !session || session.status !== "scheduled") {
      return;
    }

    try {
      setStarting(true);
      setError("");

      const updated = await updateSessionStatus(appointmentId, "active");
      setSession(updated.session);
      navigate(`/consultation/${appointmentId}`);
    } catch (err) {
      console.error("Failed to start session:", err);
      setError("Failed to start session.");
    } finally {
      setStarting(false);
    }
  }

  if (!auth.userId || !auth.actorRole) {
    return (
      <TelemedicineAccessNotice
        title="Session details need login data"
        description="This page needs a valid doctor login session. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  if (auth.actorRole !== "doctor") {
    return (
      <TelemedicineAccessNotice
        title="Session details access denied"
        description="This page is only for doctor accounts."
        actionLabel="Go to Sessions"
        actionTo="/doctor-sessions"
      />
    );
  }

  if (!loading && session && !canAccessTelemedicineSession(auth, session)) {
    return (
      <TelemedicineAccessNotice
        title="Session access denied"
        description="This appointment belongs to a different doctor account."
        actionLabel="Doctor Sessions"
        actionTo="/doctor-sessions"
      />
    );
  }

  const patientProfileName =
    `${patientProfile?.firstName || ""} ${patientProfile?.lastName || ""}`.trim();

  const doctorName = session?.doctor?.fullName || auth.username || "Doctor";
  const patientName =
    session?.patient?.fullName ||
    session?.patient?.name ||
    session?.patientName ||
    patientProfileName ||
    "Patient name not available";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Loading session details...
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-red-50 p-8 text-center text-red-600 shadow-sm">
            {error}
          </div>
        ) : !session ? (
          <div className="rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Session not found.
          </div>
        ) : (
          <div className="rounded-[32px] border border-blue-100/80 bg-white p-8 shadow-[0_22px_60px_rgba(59,130,246,0.12)]">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Session Details
              </h1>
              <p className="mt-2 text-gray-600">
                Review the patient details and open the consultation when ready.
              </p>
            </div>

            <div className="grid gap-4 rounded-2xl bg-blue-100/80 p-5 text-sm text-gray-700 sm:grid-cols-2">
              <p>
                <span className="font-semibold">Patient Name:</span>{" "}
                {patientName}
              </p>
              <p>
                <span className="font-semibold">Doctor Name:</span> {doctorName}
              </p>
              <p>
                <span className="font-semibold">Date:</span>{" "}
                {session.scheduledDate}
              </p>
              <p>
                <span className="font-semibold">Time:</span>{" "}
                {session.scheduledTime}
              </p>
              <p>
                <span className="font-semibold">Room Name:</span>{" "}
                {session.roomName || "Not available"}
              </p>
              <p>
                <span className="font-semibold">Session Status:</span>{" "}
                {session.status}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {session.status === "completed" ? (
                <Link
                  to={`/session-summary/${session.appointmentId}`}
                  className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  View Session Summary
                </Link>
              ) : session.status === "scheduled" ? (
                <button
                  type="button"
                  onClick={handleStartSession}
                  disabled={starting}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {starting ? "Starting Session..." : "Start Session"}
                </button>
              ) : session.status === "cancelled" ? null : (
                <Link
                  to={`/consultation/${session.appointmentId}`}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Open Consultation Room
                </Link>
              )}

              <Link
                to="/doctor-sessions"
                className="rounded-lg bg-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
              >
                Back to Sessions
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

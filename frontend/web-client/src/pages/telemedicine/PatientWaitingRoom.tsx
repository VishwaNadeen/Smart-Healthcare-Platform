import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import StatusBadge from "../../components/telemedicine/StatusBadge";
import { getPatientAppointments } from "../../services/appointmentApi";
import {
  getSessionByAppointmentId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";
import {
  canAccessTelemedicineSession,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

type PatientWaitingRoomSession = TelemedicineSession & {
  paymentStatus?: string;
  appointment?: TelemedicineSession["appointment"] & {
    paymentStatus?: string;
  };
};

export default function PatientWaitingRoom() {
  const { appointmentId } = useParams();
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [resolvedPaymentStatus, setResolvedPaymentStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const auth = getStoredTelemedicineAuth();

  useEffect(() => {
    async function loadSession() {
      if (!appointmentId) {
        setError("Appointment ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        setResolvedPaymentStatus("");
        const data = await getSessionByAppointmentId(appointmentId);
        setSession(data);
      } catch (err) {
        console.error("Failed to load patient waiting room:", err);
        setError("Failed to load waiting room.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [appointmentId]);

  useEffect(() => {
    async function loadPaymentStatus() {
      if (!auth.token || !session?.appointmentId) {
        return;
      }

      try {
        const appointments = await getPatientAppointments(auth.token);
        const matchingAppointment = appointments.find(
          (appointment) => appointment._id === session.appointmentId
        );

        setResolvedPaymentStatus(matchingAppointment?.paymentStatus || "");
      } catch {
        setResolvedPaymentStatus("");
      }
    }

    loadPaymentStatus();
  }, [auth.token, session?.appointmentId]);

  if (!auth.userId || !auth.actorRole) {
    return (
      <TelemedicineAccessNotice
        title="Waiting room needs login data"
        description="This page needs a valid patient login session. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  if (auth.actorRole !== "patient") {
    return (
      <TelemedicineAccessNotice
        title="Patient waiting room access denied"
        description="This page is only for patient accounts."
        actionLabel="Go to Sessions"
        actionTo="/patient-sessions"
      />
    );
  }

  if (!loading && session && !canAccessTelemedicineSession(auth, session)) {
    return (
      <TelemedicineAccessNotice
        title="Waiting room access denied"
        description="This appointment belongs to a different patient account."
        actionLabel="Patient Sessions"
        actionTo="/patient-sessions"
      />
    );
  }

  const doctorName = session?.doctor?.fullName || "Doctor name not available";
  const patientName =
    session?.patient?.fullName ||
    session?.patientName ||
    auth.username ||
    "Patient";

  const sessionDetails = session as PatientWaitingRoomSession | null;

  const paymentStatus =
    sessionDetails?.paymentStatus ||
    sessionDetails?.appointment?.paymentStatus ||
    resolvedPaymentStatus ||
    "Not available";

  const canJoin = session?.status === "active";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">
            Loading waiting room...
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
          <div className="rounded-[32px] bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Waiting Room
              </h1>
              <p className="mt-2 text-gray-600">
                {session.status === "active"
                  ? "Your doctor is ready. You can join the consultation now."
                  : session.status === "completed"
                    ? "This consultation has already finished."
                    : session.status === "cancelled"
                      ? "This consultation has been cancelled."
                      : "Please wait here until your doctor starts the consultation."}
              </p>
            </div>

            <div className="mb-6 flex justify-center">
              <StatusBadge status={session.status} />
            </div>

            <div className="grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm text-gray-700 sm:grid-cols-2">
              <p>
                <span className="font-semibold">Doctor Name:</span> {doctorName}
              </p>
              <p>
                <span className="font-semibold">Patient Name:</span>{" "}
                {patientName}
              </p>
              <p>
                <span className="font-semibold">Appointment ID:</span>{" "}
                {session.appointmentId}
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
                <span className="font-semibold">Payment Status:</span>{" "}
                {paymentStatus}
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
              ) : session.status === "cancelled" ? null : canJoin ? (
                <Link
                  to={`/consultation/${session.appointmentId}`}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Join Consultation
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-lg bg-blue-300 px-5 py-3 text-sm font-medium text-white opacity-70"
                >
                  Waiting for Doctor
                </button>
              )}

              <Link
                to="/patient-sessions"
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

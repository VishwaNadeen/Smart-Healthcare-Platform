import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PrescriptionForm from "../../components/telemedicine/PrescriptionForm";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import {
  getSessionByAppointmentId,
  type TelemedicineSession,
} from "../../services/telemedicineApi";
import {
  canAccessTelemedicineSession,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

type SessionPersonDetails = {
  name: string;
  email: string;
  phone: string;
  specialization: string;
};

function getStringValue(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getPersonDetails(
  session: TelemedicineSession,
  type: "doctor" | "patient"
): SessionPersonDetails {
  const source = session as TelemedicineSession & Record<string, unknown>;

  if (type === "doctor") {
    return {
      name:
        getStringValue(source.doctorName) ||
        getStringValue(source.doctorFullName) ||
        getStringValue(source.doctor_display_name) ||
        getStringValue(source.doctor_username) ||
        "Doctor name not available",
      email:
        getStringValue(source.doctorEmail) ||
        getStringValue(source.doctor_email) ||
        "Not available",
      phone:
        getStringValue(source.doctorPhone) ||
        getStringValue(source.doctor_phone) ||
        "Not available",
      specialization:
        getStringValue(source.doctorSpecialization) ||
        getStringValue(source.specialization) ||
        getStringValue(source.doctor_specialization) ||
        "General consultation",
    };
  }

  return {
    name:
      getStringValue(source.patientName) ||
      getStringValue(source.patientFullName) ||
      getStringValue(source.patient_display_name) ||
      getStringValue(source.patient_username) ||
      "Patient name not available",
    email:
      getStringValue(source.patientEmail) ||
      getStringValue(source.patient_email) ||
      "Not available",
    phone:
      getStringValue(source.patientPhone) ||
      getStringValue(source.patient_phone) ||
      "Not available",
    specialization: "",
  };
}

function getSummaryValue(session: TelemedicineSession, key: string): string {
  const source = session as TelemedicineSession & Record<string, unknown>;
  return getStringValue(source[key]);
}

function formatStatus(status: string | undefined) {
  const value = (status || "").trim();
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-800">
        {value || "Not available"}
      </p>
    </div>
  );
}

function PersonCard({
  title,
  name,
  email,
  phone,
  extraLabel,
  extraValue,
}: {
  title: string;
  name: string;
  email: string;
  phone: string;
  extraLabel?: string;
  extraValue?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
          {title === "Doctor" ? "DR" : "PT"}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">Consultation participant</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Name
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">{name}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email
          </p>
          <p className="mt-1 break-words text-sm text-slate-700">{email}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Phone
          </p>
          <p className="mt-1 text-sm text-slate-700">{phone}</p>
        </div>

        {extraLabel && extraValue ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {extraLabel}
            </p>
            <p className="mt-1 text-sm text-slate-700">{extraValue}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SessionSummary() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const [session, setSession] = useState<TelemedicineSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const auth = getStoredTelemedicineAuth();
  const role = auth.actorRole;
  const isDoctor = role === "doctor";

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

        const data = await getSessionByAppointmentId(appointmentId);
        setSession(data);
      } catch (err) {
        console.error("Failed to load session summary:", err);
        setError("Failed to load session summary.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [appointmentId]);

  if (!auth.userId || !role) {
    return (
      <TelemedicineAccessNotice
        title="Session summary needs login data"
        description="This page needs a valid login session with role and user id. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">
          Loading summary...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-red-50 p-8 text-center text-red-600 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 text-center text-gray-600 shadow-sm">
          Session not found.
        </div>
      </div>
    );
  }

  if (!canAccessTelemedicineSession(auth, session)) {
    return (
      <TelemedicineAccessNotice
        title="Summary access denied"
        description="This appointment belongs to a different doctor or patient account."
        actionLabel={isDoctor ? "Doctor Sessions" : "Patient Sessions"}
        actionTo={isDoctor ? "/doctor-sessions" : "/patient-sessions"}
      />
    );
  }

  const doctor = getPersonDetails(session, "doctor");
  const patient = getPersonDetails(session, "patient");
  const consultationType =
    getSummaryValue(session, "consultationType") ||
    getSummaryValue(session, "sessionType") ||
    "Video Consultation";

  const duration =
    getSummaryValue(session, "duration") ||
    getSummaryValue(session, "durationMinutes") ||
    "Not available";

  const meetingLink =
    getSummaryValue(session, "meetingLink") ||
    getSummaryValue(session, "roomUrl") ||
    getSummaryValue(session, "joinUrl");

  const prescriptionStatus =
    getSummaryValue(session, "prescriptionStatus") || "Available in summary";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Session Summary
              </div>

              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Consultation Completed
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Review consultation details, patient and doctor information,
                notes, and prescription summary for this appointment.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Appointment ID
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-800 sm:text-base">
                {session.appointmentId}
              </p>

              <div className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                {formatStatus(session.status)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PersonCard
            title="Doctor"
            name={doctor.name}
            email={doctor.email}
            phone={doctor.phone}
            extraLabel="Specialization"
            extraValue={doctor.specialization}
          />

          <PersonCard
            title="Patient"
            name={patient.name}
            email={patient.email}
            phone={patient.phone}
          />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-100 p-4 sm:p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Appointment Details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailCard label="Date" value={session.scheduledDate || "Not available"} />
            <DetailCard label="Time" value={session.scheduledTime || "Not available"} />
            <DetailCard label="Room Name" value={session.roomName || "Not available"} />
            <DetailCard label="Consultation Type" value={consultationType} />
            <DetailCard label="Doctor ID" value={session.doctorId || "Not available"} />
            <DetailCard label="Patient ID" value={session.patientId || "Not available"} />
            <DetailCard label="Duration" value={duration} />
            <DetailCard label="Prescription Status" value={prescriptionStatus} />
          </div>

          {meetingLink ? (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Meeting Link / Room URL
              </p>
              <p className="mt-2 break-all text-sm text-blue-900">{meetingLink}</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="rounded-2xl bg-slate-50 p-3">
              <PrescriptionForm
                role={role}
                appointmentId={session.appointmentId}
                doctorId={session.doctorId}
                patientId={session.patientId}
                consultationNotes={session.notes || ""}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {isDoctor ? (
            <Link
              to="/doctor-sessions"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Back to Doctor Sessions
            </Link>
          ) : (
            <>
              <Link
                to="/patient-sessions"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Back to Patient Sessions
              </Link>
              <Link
                to="/session-history"
                className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                View Session History
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import FullScreenPageLoading from "../../components/common/FullScreenPageLoading";
import PrescriptionForm from "../../components/telemedicine/PrescriptionForm";
import PrescriptionPdfGenerator from "../../components/telemedicine/PrescriptionPdfGenerator";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import {
  getCurrentPatientProfile,
  getPatientSummaryByAuthUserId,
} from "../../services/patientApi";
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
  licenseNumber: string;
  hospitalName: string;
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
  const doctorSource =
    typeof source.doctor === "object" && source.doctor !== null
      ? (source.doctor as Record<string, unknown>)
      : {};
  const patientSource =
    typeof source.patient === "object" && source.patient !== null
      ? (source.patient as Record<string, unknown>)
      : {};

  if (type === "doctor") {
    return {
      name:
        getStringValue(source.doctorName) ||
        getStringValue(doctorSource.fullName) ||
        getStringValue(doctorSource.name) ||
        getStringValue(source.doctorFullName) ||
        getStringValue(source.doctor_display_name) ||
        getStringValue(source.doctor_username) ||
        "Doctor name not available",
      licenseNumber:
        getStringValue(doctorSource.licenseNumber) ||
        getStringValue(source.licenseNumber) ||
        getStringValue(source.doctorLicenseNumber) ||
        getStringValue(source.doctor_license_number) ||
        "Not available",
      hospitalName:
        getStringValue(doctorSource.hospitalName) ||
        getStringValue(source.hospitalName) ||
        getStringValue(source.doctorHospitalName) ||
        getStringValue(source.doctorHospital) ||
        getStringValue(source.doctor_hospital_name) ||
        "Not available",
      specialization:
        getStringValue(doctorSource.specialization) ||
        getStringValue(source.doctorSpecialization) ||
        getStringValue(source.specialization) ||
        getStringValue(source.doctor_specialization) ||
        "General consultation",
    };
  }

  return {
    name:
      getStringValue(source.patientName) ||
      getStringValue(patientSource.fullName) ||
      getStringValue(patientSource.name) ||
      getStringValue(source.patientFullName) ||
      getStringValue(source.patient_display_name) ||
      getStringValue(source.patient_username) ||
      "Patient name not available",
    licenseNumber: "",
    hospitalName: "",
    specialization: "",
  };
}

function getSummaryValue(session: TelemedicineSession, key: string): string {
  const source = session as TelemedicineSession & Record<string, unknown>;
  return getStringValue(source[key]);
}

function formatLabelValue(value: string | undefined): string {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "Not available";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDurationFromMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return "Not available";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} hr ${minutes} min`;
  }

  if (hours > 0) {
    return `${hours} hr`;
  }

  return `${minutes} min`;
}

function getSessionDuration(session: TelemedicineSession): string {
  const explicitDuration =
    getSummaryValue(session, "duration") || getSummaryValue(session, "durationMinutes");

  if (explicitDuration) {
    return explicitDuration;
  }

  const createdAt = session.createdAt ? new Date(session.createdAt) : null;
  const updatedAt = session.updatedAt ? new Date(session.updatedAt) : null;

  if (
    !createdAt ||
    !updatedAt ||
    Number.isNaN(createdAt.getTime()) ||
    Number.isNaN(updatedAt.getTime()) ||
    updatedAt.getTime() <= createdAt.getTime()
  ) {
    return "Not available";
  }

  const totalMinutes = Math.round(
    (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60)
  );

  return formatDurationFromMinutes(totalMinutes);
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
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
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  extraLabel,
  extraValue,
}: {
  title: string;
  name: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  extraLabel?: string;
  extraValue?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">Consultation participant</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Name
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">{name}</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {primaryLabel}
          </p>
          <p className="mt-1 break-words text-sm text-slate-700">{primaryValue}</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {secondaryLabel}
          </p>
          <p className="mt-1 text-sm text-slate-700">{secondaryValue}</p>
        </div>

        {extraLabel && extraValue ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
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
  const [matchedPanelHeight, setMatchedPanelHeight] = useState<number | null>(null);
  const [readOnlyNotesHeight, setReadOnlyNotesHeight] = useState<number | null>(null);
  const [patientPdfName, setPatientPdfName] = useState("Not available");
  const [patientPdfAge, setPatientPdfAge] = useState<number | null>(null);
  const leftColumnRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelHeaderRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<TelemedicineSession | null>(null);
  const auth = getStoredTelemedicineAuth();
  const role = auth.actorRole;

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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

  useEffect(() => {
    if (!appointmentId || role !== "patient") {
      return;
    }

    let isMounted = true;

    function getSessionRefreshSignature(nextSession: TelemedicineSession | null) {
      if (!nextSession) {
        return "";
      }

      return JSON.stringify({
        notes: nextSession.notes || "",
        status: nextSession.status || "",
        updatedAt: nextSession.updatedAt || "",
        scheduledDate: nextSession.scheduledDate || "",
        scheduledTime: nextSession.scheduledTime || "",
      });
    }

    const intervalId = window.setInterval(async () => {
      try {
        const latestSession = await getSessionByAppointmentId(appointmentId);

        if (!isMounted) {
          return;
        }

        const currentSignature = getSessionRefreshSignature(sessionRef.current);
        const latestSignature = getSessionRefreshSignature(latestSession);

        if (currentSignature !== latestSignature) {
          setSession(latestSession);
        }
      } catch (pollError) {
        console.error("Failed to refresh session summary data:", pollError);
      }
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [appointmentId, role]);

  useEffect(() => {
    function syncPanelHeight() {
      if (typeof window === "undefined" || window.innerWidth < 1024) {
        setMatchedPanelHeight(null);
        setReadOnlyNotesHeight(null);
        return;
      }

      const nextHeight = leftColumnRef.current?.getBoundingClientRect().height ?? 0;
      setMatchedPanelHeight(nextHeight > 0 ? Math.ceil(nextHeight) : null);

      const rightPanelTop = rightPanelRef.current?.getBoundingClientRect().top ?? 0;
      const headerBottom = rightPanelHeaderRef.current?.getBoundingClientRect().bottom ?? 0;
      const headerGap = 16;
      const nextNotesHeight = Math.floor(rightPanelTop + nextHeight / 2 - headerBottom - headerGap);

      setReadOnlyNotesHeight(nextNotesHeight > 102 ? nextNotesHeight : 102);
    }

    const frameId = window.requestAnimationFrame(syncPanelHeight);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && leftColumnRef.current
        ? new ResizeObserver(() => syncPanelHeight())
        : null;

    if (leftColumnRef.current && resizeObserver) {
      resizeObserver.observe(leftColumnRef.current);
    }

    window.addEventListener("resize", syncPanelHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncPanelHeight);
    };
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    function calculateAge(birthday: string) {
      const birthDate = new Date(birthday);

      if (Number.isNaN(birthDate.getTime())) {
        return null;
      }

      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age -= 1;
      }

      return age >= 0 ? age : null;
    }

    async function loadPatientPdfDetails() {
      if (!session) {
        if (isMounted) {
          setPatientPdfName("Not available");
          setPatientPdfAge(null);
        }
        return;
      }

      const fallbackPatientName =
        getStringValue(session.patient?.fullName) ||
        getStringValue(session.patient?.name) ||
        getStringValue(session.patientName) ||
        getStringValue(auth.username) ||
        "Not available";

      if (!auth.token || !role) {
        if (isMounted) {
          setPatientPdfName(fallbackPatientName);
          setPatientPdfAge(null);
        }
        return;
      }

      try {
        if (role === "patient") {
          const patientProfile = await getCurrentPatientProfile(auth.token);
          const fullName =
            `${patientProfile.firstName || ""} ${patientProfile.lastName || ""}`.trim() ||
            fallbackPatientName;

          if (isMounted) {
            setPatientPdfName(fullName);
            setPatientPdfAge(calculateAge(patientProfile.birthday));
          }
          return;
        }

        const patientSummary = await getPatientSummaryByAuthUserId(
          auth.token,
          session.patientId
        );
        const fullName =
          `${patientSummary.firstName || ""} ${patientSummary.lastName || ""}`.trim() ||
          fallbackPatientName;

        if (isMounted) {
          setPatientPdfName(fullName);
          setPatientPdfAge(patientSummary.age);
        }
      } catch (patientError) {
        console.error("Failed to load patient PDF details:", patientError);
        if (isMounted) {
          setPatientPdfName(fallbackPatientName);
          setPatientPdfAge(null);
        }
      }
    }

    void loadPatientPdfDetails();

    return () => {
      isMounted = false;
    };
  }, [auth.token, auth.username, role, session]);

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
    return <FullScreenPageLoading message="Loading session summary..." />;
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
        actionLabel={role === "doctor" ? "Doctor Sessions" : "Patient Sessions"}
        actionTo={role === "doctor" ? "/doctor-sessions" : "/patient-sessions"}
      />
    );
  }

  const doctor = getPersonDetails(session, "doctor");
  const duration = getSessionDuration(session);
  const sessionStatus = formatLabelValue(session.status);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-blue-100/60 sm:p-8">
          <div className="-mx-6 -mt-6 mb-6 h-1 bg-blue-500 sm:-mx-8 sm:-mt-8" />
          <div className="flex flex-col items-center justify-center gap-5 text-center">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Session Summary
              </div>

              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Consultation Completed
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Review doctor information, notes, and prescription summary for
                this appointment.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div ref={leftColumnRef} className="space-y-6">
            <PersonCard
              title="Doctor"
              name={doctor.name}
              primaryLabel="License No"
              primaryValue={doctor.licenseNumber}
              secondaryLabel="Hospital"
              secondaryValue={doctor.hospitalName}
              extraLabel="Specialization"
              extraValue={doctor.specialization}
            />

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Consultation Session Details
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <DetailCard label="Date" value={session.scheduledDate || "Not available"} />
                <DetailCard label="Time" value={session.scheduledTime || "Not available"} />
                <DetailCard label="Room Name" value={session.roomName || "Not available"} />
                <DetailCard label="Doctor Name" value={doctor.name} />
                <DetailCard label="Session Status" value={sessionStatus} />
                <DetailCard label="Duration" value={duration} />
              </div>
            </div>
          </div>

          <div
            ref={rightPanelRef}
            className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            style={matchedPanelHeight ? { height: matchedPanelHeight } : undefined}
          >
            <div ref={rightPanelHeaderRef} className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Prescription & Medical Notes
              </h2>
              <PrescriptionPdfGenerator
                appointmentId={session.appointmentId}
                specialization={doctor.specialization}
                doctorName={doctor.name}
                licenseNumber={doctor.licenseNumber}
                hospitalName={doctor.hospitalName}
                patientName={patientPdfName}
                patientAge={patientPdfAge}
                autoRefreshWhenEmpty={role === "patient"}
                buttonClassName="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PrescriptionForm
                role={role}
                appointmentId={session.appointmentId}
                doctorId={session.doctorId}
                patientId={session.patientId}
                consultationNotes={session.notes || ""}
                readOnly
                plainReadOnly
                hideTitle
                autoRefreshWhenEmpty={role === "patient"}
                readOnlyNotesHeight={readOnlyNotesHeight}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

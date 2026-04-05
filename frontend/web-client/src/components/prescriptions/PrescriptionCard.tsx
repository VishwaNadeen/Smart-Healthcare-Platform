import { useState } from "react";
import type { Appointment } from "../../services/appointmentApi";
import type { TelemedicinePrescription } from "../../services/telemedicineApi";
import PrescriptionPdfGenerator from "../telemedicine/PrescriptionPdfGenerator";

type PrescriptionCardProps = {
  appointment: Appointment;
  currentUsername: string;
  defaultOpen: boolean;
  prescriptions: TelemedicinePrescription[];
};

function formatDate(dateString?: string) {
  if (!dateString) {
    return "N/A";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeOnly(dateString?: string) {
  if (!dateString) {
    return "N/A";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PrescriptionTable({
  prescriptions,
}: {
  prescriptions: TelemedicinePrescription[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse bg-white">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                #
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Medicine
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dosage
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Instructions
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Issued Date
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {prescriptions.map((prescription, index) => (
              <tr
                key={prescription._id}
                className="border-t border-slate-200 align-top"
              >
                <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                  {index + 1}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                  {prescription.medicineName}
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">
                  {prescription.dosage || "N/A"}
                </td>
                <td className="px-4 py-4 text-sm leading-6 text-slate-700">
                  {prescription.instructions || "No special instructions."}
                </td>
                <td className="px-4 py-4 text-sm text-slate-500">
                  {formatDate(prescription.createdAt)}
                </td>
                <td className="px-4 py-4 text-sm text-slate-500">
                  {formatTimeOnly(prescription.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChevronToggleIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${
        isExpanded ? "rotate-180" : ""
      }`}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PrescriptionCard({
  appointment,
  currentUsername,
  defaultOpen,
  prescriptions,
}: PrescriptionCardProps) {
  const [isPrescriptionsExpanded, setIsPrescriptionsExpanded] = useState(defaultOpen);
  const issuedDate = prescriptions[0]?.createdAt;

  function handleHeaderToggle() {
    setIsPrescriptionsExpanded((current) => !current);
  }

  return (
    <section className="rounded-3xl bg-gradient-to-br from-blue-50/60 via-white to-white p-5 shadow-sm ring-1 ring-blue-100 sm:p-6">
      <div
        role="button"
        tabIndex={0}
        onClick={handleHeaderToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleHeaderToggle();
          }
        }}
        className="group flex w-full items-center justify-between gap-4 rounded-2xl px-3 py-2 text-left transition-all duration-200 active:scale-[0.998]"
        aria-label={
          isPrescriptionsExpanded
            ? "Collapse prescriptions section"
            : "Expand prescriptions section"
        }
      >
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {appointment.doctorName || "Doctor details unavailable"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div onClick={(event) => event.stopPropagation()}>
            <PrescriptionPdfGenerator
              appointmentId={appointment._id}
              specialization={appointment.specialization || ""}
              doctorName={appointment.doctorName || "Not available"}
              licenseNumber=""
              hospitalName=""
              patientName={appointment.patientName || currentUsername || "Not available"}
              patientAge={null}
              buttonClassName="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white transition group-hover:bg-slate-100">
            <ChevronToggleIcon isExpanded={isPrescriptionsExpanded} />
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Appointment Date
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {formatDate(appointment.appointmentDate)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Specialization
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {appointment.specialization || "N/A"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prescription Entries
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {prescriptions.length}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Issued Date
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {issuedDate ? formatDate(issuedDate) : "N/A"}
          </p>
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isPrescriptionsExpanded
            ? "mt-6 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200 pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-blue-600">Prescriptions</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {prescriptions.length} Entry{prescriptions.length !== 1 ? "ies" : "y"}
                </h3>
              </div>
            </div>

            {prescriptions.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">
                No prescription entries were saved for this appointment.
              </div>
            ) : (
              <PrescriptionTable prescriptions={prescriptions} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

import type { MouseEvent, ReactNode } from "react";
import type { Patient } from "../../types/patient";

function maskEmail(email: string) {
  const [localPart, domain = ""] = email.split("@");

  if (!localPart || !domain) {
    return "-";
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}

function maskPhone(countryCode?: string, phone?: string) {
  const digits = `${countryCode || ""}${phone || ""}`.replace(/\s+/g, "");

  if (!digits) {
    return "-";
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 1)}***`;
  }

  return `${digits.slice(0, 4)}***${digits.slice(-2)}`;
}

function getInitials(patient: Patient) {
  const firstInitial = patient.firstName?.trim()?.[0] || "";
  const lastInitial = patient.lastName?.trim()?.[0] || "";
  return `${firstInitial}${lastInitial}`.toUpperCase() || "P";
}

function getPatientCode(id: string) {
  return `P-${id.slice(-4).toUpperCase()}`;
}

function formatCreatedDate(createdAt?: string) {
  if (!createdAt) {
    return "-";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-CA");
}

function getAvatarClass(index: number) {
  const avatarClasses = [
    "bg-violet-600",
    "bg-rose-500",
    "bg-blue-600",
    "bg-emerald-600",
    "bg-amber-500",
  ];

  return avatarClasses[index % avatarClasses.length];
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-orange-500 transition hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

type PatientTableProps = {
  patients: Patient[];
  loading: boolean;
  onView: (patient: Patient) => void;
  onToggleStatus: (patient: Patient) => void;
};

export default function PatientTable({
  patients,
  loading,
  onView,
  onToggleStatus,
}: PatientTableProps) {
  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-slate-600">Loading patients...</p>
      </div>
    );
  }

  if (!patients.length) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-slate-600">No patients found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[2.2fr_1.4fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 lg:grid">
        <div>Patient</div>
        <div>Email</div>
        <div>Phone</div>
        <div>Country</div>
        <div>Status</div>
        <div>Created</div>
        <div>Actions</div>
      </div>

      <div>
        {patients.map((patient, index) => {
          const isActive = (patient.status || "active") === "active";

          return (
            <div
              key={patient._id}
              onClick={() => onView(patient)}
              className={`cursor-pointer border-t border-slate-100 px-5 py-5 transition hover:bg-slate-50/70 first:border-t-0 ${
                index === 0 ? "lg:border-l-4 lg:border-l-blue-600" : ""
              }`}
            >
              <div className="grid gap-5 lg:grid-cols-[2.2fr_1.4fr_1.2fr_1fr_1fr_1fr_1fr] lg:items-center">
                <div className="flex items-center gap-3">
                  {patient.profileImage ? (
                    <img
                      src={patient.profileImage}
                      alt={`${patient.firstName} ${patient.lastName}`}
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white ${getAvatarClass(
                        index
                      )}`}
                    >
                      {getInitials(patient)}
                    </div>
                  )}

                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{getPatientCode(patient._id)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                    Email
                  </p>
                  <p className="text-base text-slate-600">{maskEmail(patient.email)}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                    Phone
                  </p>
                  <p className="text-base text-slate-600">
                    {maskPhone(patient.countryCode, patient.phone)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                    Country
                  </p>
                  <p className="text-base text-slate-600">{patient.country || "-"}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                    Status
                  </p>
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${
                      isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                    Created
                  </p>
                  <p className="text-base text-slate-400">
                    {formatCreatedDate(patient.createdAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                    Actions
                  </p>
                  <div className="flex flex-nowrap items-center gap-1.5">
                    <IconButton
                      title="View"
                      onClick={(event) => {
                        event.stopPropagation();
                        onView(patient);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </IconButton>

                    <IconButton
                      title={isActive ? "Deactivate" : "Activate"}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleStatus(patient);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </IconButton>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

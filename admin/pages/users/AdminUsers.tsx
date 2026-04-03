import { useEffect, useMemo, useState } from "react";
import PatientTable from "../../components/patients/PatientTable";
import { patientAdminService } from "../../services/patients/patientAdminService";
import type {
  Patient,
  PatientAppointmentStats,
} from "../../types/patient";

function maskEmail(email?: string) {
  if (!email) {
    return "-";
  }

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

function formatBirthday(birthday?: string) {
  if (!birthday) {
    return "-";
  }

  const date = new Date(birthday);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

function getPatientInitials(patient: Patient) {
  const firstInitial = patient.firstName?.trim()?.[0] || "";
  const lastInitial = patient.lastName?.trim()?.[0] || "";
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();

  return initials || "P";
}

function SummaryCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption: string;
}) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-blue-900 sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-base text-slate-400">{caption}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value || "-"}
      </p>
    </div>
  );
}

type ConfirmationState = {
  title: string;
  message: string;
  tone?: "default" | "danger";
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
};

type ToastState = {
  tone: "success" | "error";
  message: string;
};

export default function AdminUsersPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDetailsLoading, setPatientDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"patients" | "doctors">("patients");
  const [appointmentStats, setAppointmentStats] =
    useState<PatientAppointmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [totalBookings, setTotalBookings] = useState(0);
  const [bookingSummaryLoading, setBookingSummaryLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  const fetchPatients = async (searchText = "") => {
    try {
      setLoading(true);
      setPageError("");
      const data = await patientAdminService.getAllPatients(searchText);
      setPatients(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load patients";
      setPageError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const matchesSearch =
        !keyword ||
        fullName.includes(keyword) ||
        patient._id.toLowerCase().includes(keyword);
      const patientStatus = patient.status || "active";
      const matchesStatus =
        statusFilter === "all" ? true : patientStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [patients, search, statusFilter]);

  const patientSummary = useMemo(() => {
    const totalPatients = patients.length;
    const activePatients = patients.filter(
      (patient) => (patient.status || "active") === "active"
    ).length;

    return {
      totalPatients,
      activePatients,
      inactivePatients: totalPatients - activePatients,
    };
  }, [patients]);

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const showToast = (tone: ToastState["tone"], message: string) => {
    setToast({ tone, message });
  };

  const handleView = async (patient: Patient) => {
    try {
      setPatientDetailsLoading(true);
      const details = await patientAdminService.getPatientById(patient._id);
      setSelectedPatient(details);
    } catch {
      setSelectedPatient(patient);
    } finally {
      setPatientDetailsLoading(false);
    }
  };

  const handleToggleStatus = async (patient: Patient) => {
    const nextStatus = patient.status === "inactive" ? "active" : "inactive";
    setConfirmation({
      title: `${nextStatus === "inactive" ? "Deactivate" : "Activate"} Patient`,
      message:
        nextStatus === "inactive"
          ? `Are you sure you want to deactivate ${patient.firstName} ${patient.lastName}?`
          : `Are you sure you want to activate ${patient.firstName} ${patient.lastName}?`,
      confirmLabel: nextStatus === "inactive" ? "Deactivate" : "Activate",
      tone: nextStatus === "inactive" ? "danger" : "default",
      onConfirm: async () => {
        const updated = await patientAdminService.updatePatientStatus(
          patient._id,
          nextStatus
        );

        setPatients((prev) =>
          prev.map((item) => (item._id === updated._id ? updated : item))
        );

        if (selectedPatient?._id === updated._id) {
          setSelectedPatient(updated);
        }

        showToast(
          "success",
          `Patient ${nextStatus === "inactive" ? "deactivated" : "activated"} successfully.`
        );
      },
    });
  };

  const handleDelete = async (patient: Patient) => {
    setConfirmation({
      title: "Delete Patient",
      message: `This will permanently remove ${patient.firstName} ${patient.lastName} from the system.`,
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        await patientAdminService.deletePatient(patient._id);

        setPatients((prev) => prev.filter((item) => item._id !== patient._id));

        if (selectedPatient?._id === patient._id) {
          setSelectedPatient(null);
        }

        showToast("success", "Patient deleted successfully.");
      },
    });
  };

  useEffect(() => {
    async function loadAppointmentStats() {
      if (!selectedPatient?._id) {
        setAppointmentStats(null);
        return;
      }

      try {
        setStatsLoading(true);
        const stats = await patientAdminService.getPatientAppointmentStats(
          selectedPatient._id
        );
        setAppointmentStats(stats);
      } catch {
        setAppointmentStats(null);
      } finally {
        setStatsLoading(false);
      }
    }

    void loadAppointmentStats();
  }, [selectedPatient?._id]);

  useEffect(() => {
    let ignore = false;

    async function loadBookingSummary() {
      if (patients.length === 0) {
        setTotalBookings(0);
        return;
      }

      try {
        setBookingSummaryLoading(true);

        const results = await Promise.allSettled(
          patients.map((patient) =>
            patientAdminService.getPatientAppointmentStats(patient._id)
          )
        );

        if (ignore) {
          return;
        }

        const bookings = results.reduce((total, result) => {
          if (result.status !== "fulfilled") {
            return total;
          }

          return total + result.value.totalBookings;
        }, 0);

        setTotalBookings(bookings);
      } catch {
        if (!ignore) {
          setTotalBookings(0);
        }
      } finally {
        if (!ignore) {
          setBookingSummaryLoading(false);
        }
      }
    }

    void loadBookingSummary();

    return () => {
      ignore = true;
    };
  }, [patients]);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab("patients")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold ${
              activeTab === "patients"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Patients
          </button>

          <button
            onClick={() => setActiveTab("doctors")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold ${
              activeTab === "doctors"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Doctors
          </button>
        </div>
      </div>

      {activeTab === "patients" && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Patients"
              value={patientSummary.totalPatients}
              caption="Registered"
            />
            <SummaryCard
              label="Active"
              value={patientSummary.activePatients}
              caption="Receiving care"
            />
            <SummaryCard
              label="Inactive"
              value={patientSummary.inactivePatients}
              caption="Deactivated"
            />
            <SummaryCard
              label="Total Bookings"
              value={bookingSummaryLoading ? "..." : totalBookings}
              caption="All time"
            />
          </div>

          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex w-full flex-col gap-3 lg:max-w-4xl lg:flex-row">
              <input
                type="text"
                placeholder="Search by patient ID or name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "active" | "inactive")
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-xl border border-red-200 px-5 py-3 font-medium text-red-500 transition hover:bg-red-50"
              >
                Clear
              </button>
            </div>

            {pageError && (
              <div className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
                {pageError}
              </div>
            )}
          </div>

          <div className="mt-6">
            <PatientTable
              patients={filteredPatients}
              loading={loading}
              onView={handleView}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
            />
          </div>
        </>
      )}

      {activeTab === "doctors" && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-800">Doctor Management</h2>
          <p className="mt-2 text-slate-600">
            Add doctor management here later. Keep doctor-service separate from
            patient-service.
          </p>
        </div>
      )}

      {toast && (
        <div className="fixed right-5 top-20 z-[70]">
          <div
            className={`min-w-[280px] rounded-2xl border px-4 py-3 shadow-xl ${
              toast.tone === "success"
                ? "border-emerald-200 bg-white text-slate-800"
                : "border-red-200 bg-white text-slate-800"
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                toast.tone === "success" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {toast.tone === "success" ? "Success" : "Something went wrong"}
            </p>
            <p className="mt-1 text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      {confirmation && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={() => !confirming && setConfirmation(null)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  confirmation.tone === "danger"
                    ? "bg-red-50 text-red-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-slate-900">
                  {confirmation.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {confirmation.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                disabled={confirming}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirming}
                onClick={async () => {
                  try {
                    setConfirming(true);
                    await confirmation.onConfirm();
                    setConfirmation(null);
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : "Action failed";
                    showToast("error", message);
                  } finally {
                    setConfirming(false);
                  }
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-60 ${
                  confirmation.tone === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {confirming ? "Please wait..." : confirmation.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPatient(null)}
        >
          <div
            className="w-full max-w-7xl rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Patient Overview
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">
                    Patient Details
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                      selectedPatient.status === "inactive"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {selectedPatient.status === "inactive" ? "Inactive" : "Active"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {!patientDetailsLoading && (
              <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1.15fr_0.95fr]">
                <div>
                  <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      {selectedPatient.profileImage ? (
                        <img
                          src={selectedPatient.profileImage}
                          alt={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
                          className="h-20 w-20 rounded-[22px] object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-sm">
                          {getPatientInitials(selectedPatient)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-2xl font-semibold leading-tight text-slate-900">
                          {[selectedPatient.title, selectedPatient.firstName, selectedPatient.lastName]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Appointment Statistics
                    </p>
                    <h4 className="mt-1 text-lg font-semibold text-slate-900">
                      Engagement Summary
                    </h4>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 xl:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Total Bookings
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">
                        {statsLoading ? "..." : appointmentStats?.totalBookings ?? 0}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-amber-100 bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                        Pending
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-amber-800">
                        {statsLoading ? "..." : appointmentStats?.pendingBookings ?? 0}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                        Confirmed
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-blue-800">
                        {statsLoading ? "..." : appointmentStats?.confirmedBookings ?? 0}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-red-100 bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                        Cancelled
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-red-800">
                        {statsLoading ? "..." : appointmentStats?.cancelledBookings ?? 0}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-[20px] border border-emerald-100 bg-emerald-50 p-4 xl:col-span-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        Completed
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-emerald-800">
                        {statsLoading ? "..." : appointmentStats?.completedBookings ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Patient Information
                  </p>
                  <h4 className="mt-1 text-lg font-semibold text-slate-900">
                    Profile Records
                  </h4>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailRow
                      label="Full Name"
                      value={[selectedPatient.title, selectedPatient.firstName, selectedPatient.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    />
                    <DetailRow label="Title" value={selectedPatient.title || "-"} />
                    <DetailRow label="Email" value={maskEmail(selectedPatient.email)} />
                    <DetailRow
                      label="Phone"
                      value={maskPhone(selectedPatient.countryCode, selectedPatient.phone)}
                    />
                    <DetailRow
                      label="Birthday"
                      value={formatBirthday(selectedPatient.birthday)}
                    />
                    <DetailRow label="Country" value={selectedPatient.country || "-"} />
                    <DetailRow label="Address" value={selectedPatient.address || "-"} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

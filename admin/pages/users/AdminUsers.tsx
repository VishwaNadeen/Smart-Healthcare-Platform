import { useEffect, useMemo, useState } from "react";
import PatientFormModal from "../../components/patients/PatientFormModal";
import PatientTable from "../../components/patients/PatientTable";
import { patientAdminService } from "../../services/patients/patientAdminService";
import type {
  Patient,
  PatientAppointmentStats,
  PatientUpdatePayload,
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

function maskBirthday(birthday?: string) {
  if (!birthday) {
    return "-";
  }

  const date = new Date(birthday);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `••/••/${date.getFullYear()}`;
}

export default function AdminUsersPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<"patients" | "doctors">("patients");
  const [appointmentStats, setAppointmentStats] =
    useState<PatientAppointmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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
    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients;

    const keyword = search.toLowerCase();

    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const email = patient.email?.toLowerCase() || "";
      const phone = `${patient.countryCode || ""}${patient.phone || ""}`.toLowerCase();

      return (
        fullName.includes(keyword) ||
        email.includes(keyword) ||
        phone.includes(keyword)
      );
    });
  }, [patients, search]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchPatients(search);
  };

  const handleView = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
  };

  const handleSavePatient = async (payload: PatientUpdatePayload) => {
    if (!editingPatient) return;

    try {
      const updated = await patientAdminService.updatePatient(editingPatient._id, payload);

      setPatients((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item))
      );

      setEditingPatient(null);
      alert("Patient updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update patient";
      alert(message);
    }
  };

  const handleToggleStatus = async (patient: Patient) => {
    const nextStatus = patient.status === "inactive" ? "active" : "inactive";
    const confirmMessage =
      nextStatus === "inactive"
        ? "Are you sure you want to deactivate this patient?"
        : "Are you sure you want to activate this patient?";

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    try {
      const updated = await patientAdminService.updatePatientStatus(
        patient._id,
        nextStatus
      );

      setPatients((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update status";
      alert(message);
    }
  };

  const handleDelete = async (patient: Patient) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${patient.firstName} ${patient.lastName}?`
    );

    if (!confirmed) return;

    try {
      await patientAdminService.deletePatient(patient._id);

      setPatients((prev) => prev.filter((item) => item._id !== patient._id));

      if (selectedPatient?._id === patient._id) {
        setSelectedPatient(null);
      }

      alert("Patient deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete patient";
      alert(message);
    }
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

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-4xl font-bold text-slate-800">Admin Users</h1>
        <p className="mt-2 text-lg text-slate-600">
          Here you will manage doctors and patients.
        </p>
      </div>

      <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
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
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Patient Management
                </h2>
                <p className="mt-1 text-slate-600">
                  View, update, activate, deactivate, and delete patients.
                </p>
              </div>

              <form
                onSubmit={handleSearchSubmit}
                className="flex w-full max-w-xl gap-3"
              >
                <input
                  type="text"
                  placeholder="Search by name, email, or phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
                >
                  Search
                </button>
              </form>
            </div>

            {pageError && (
              <div className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
                {pageError}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <PatientTable
                patients={filteredPatients}
                loading={loading}
                onView={handleView}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800">
                Patient Details
              </h3>

              {!selectedPatient ? (
                <p className="mt-4 text-slate-600">
                  Select a patient to view full details.
                </p>
              ) : (
                <div className="mt-5 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total Bookings
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-800">
                        {statsLoading ? "..." : appointmentStats?.totalBookings ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Pending
                      </p>
                      <p className="mt-2 text-2xl font-bold text-amber-800">
                        {statsLoading ? "..." : appointmentStats?.pendingBookings ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        Confirmed
                      </p>
                      <p className="mt-2 text-2xl font-bold text-blue-800">
                        {statsLoading ? "..." : appointmentStats?.confirmedBookings ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Cancelled
                      </p>
                      <p className="mt-2 text-2xl font-bold text-red-800">
                        {statsLoading ? "..." : appointmentStats?.cancelledBookings ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Completed
                      </p>
                      <p className="mt-2 text-2xl font-bold text-emerald-800">
                        {statsLoading ? "..." : appointmentStats?.completedBookings ?? 0}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">Name:</span>{" "}
                    <span className="text-slate-600">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">Email:</span>{" "}
                    <span className="text-slate-600">
                      {maskEmail(selectedPatient.email)}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">Phone:</span>{" "}
                    <span className="text-slate-600">
                      {maskPhone(
                        selectedPatient.countryCode,
                        selectedPatient.phone
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">Birthday:</span>{" "}
                    <span className="text-slate-600">
                      {maskBirthday(selectedPatient.birthday)}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">Gender:</span>{" "}
                    <span className="text-slate-600">
                      {selectedPatient.gender || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">Country:</span>{" "}
                    <span className="text-slate-600">
                      {selectedPatient.country || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">Address:</span>{" "}
                    <span className="text-slate-600">
                      {selectedPatient.address || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">Status:</span>{" "}
                    <span className="text-slate-600">
                      {selectedPatient.status || "active"}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700">
                      Created At:
                    </span>{" "}
                    <span className="text-slate-600">
                      {selectedPatient.createdAt
                        ? new Date(selectedPatient.createdAt).toLocaleString()
                        : "-"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "doctors" && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-800">Doctor Management</h2>
          <p className="mt-2 text-slate-600">
            Add doctor management here later. Keep doctor-service separate from patient-service.
          </p>
        </div>
      )}

      <PatientFormModal
        open={!!editingPatient}
        patient={editingPatient}
        onClose={() => setEditingPatient(null)}
        onSave={handleSavePatient}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  deleteDoctor as deleteDoctorRecord,
  getDoctorDetails,
  getDoctorVerifications,
  updateDoctorDetails,
  updateDoctorVerification,
  type DoctorReviewNote,
  type DoctorVerification,
  type DoctorVerificationStatus,
} from "../../services/adminApi";

const FILTERS: Array<{ label: string; value: DoctorVerificationStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Review", value: "in-review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const PAGE_SIZES = [10, 20, 50] as const;
const REVIEW_UNLOCKABLE_FIELDS = [
  "fullName",
  "phone",
  "qualification",
  "licenseNumber",
  "hospitalName",
  "hospitalAddress",
  "city",
  "consultationFee",
  "about",
] as const;

type PanelTab = "overview" | "edit" | "review";
type EditState = {
  fullName: string;
  email: string;
  phone: string;
  specialization: string;
  experience: string;
  qualification: string;
  licenseNumber: string;
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  consultationFee: string;
  about: string;
  acceptsNewAppointments: boolean;
};

const badgeClass = (status: DoctorVerificationStatus) =>
  status === "approved"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "rejected"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : status === "in-review"
    ? "border-orange-200 bg-orange-50 text-orange-700"
    : "border-amber-200 bg-amber-50 text-amber-700";

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "Not reviewed yet";

const formatCurrency = (value?: number) =>
  value === undefined
    ? "Not set"
    : new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        maximumFractionDigits: 0,
      }).format(value);

function EmailVerificationBadge({ isVerified }: { isVerified?: boolean }) {
  if (typeof isVerified !== "boolean") return null;

  if (isVerified === true) {
    return (
      <span
        title="Email verified"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
      >
        ✓
      </span>
    );
  }

  return (
    <span
      title="Email not verified"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700"
    >
      !
    </span>
  );
}

const toEditState = (doctor: DoctorVerification): EditState => ({
  fullName: doctor.fullName || "",
  email: doctor.email || "",
  phone: doctor.phone || "",
  specialization: doctor.specialization || "",
  experience: String(doctor.experience ?? ""),
  qualification: doctor.qualification || "",
  licenseNumber: doctor.licenseNumber || "",
  consultationFee: String(doctor.consultationFee ?? ""),
  hospitalName: doctor.hospitalName || "",
  hospitalAddress: doctor.hospitalAddress || "",
  city: doctor.city || "",
  about: doctor.about || "",
  acceptsNewAppointments: doctor.acceptsNewAppointments !== false,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value || "Not provided"}</p>
    </div>
  );
}

function ReviewTimeline({ notes }: { notes: DoctorReviewNote[] }) {
  if (notes.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        No review notes added yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes
        .slice()
        .reverse()
        .map((note, index) => (
          <div
            key={`${note.createdAt || "review"}-${index}`}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(
                  note.status
                )}`}
              >
                {note.status}
              </span>
              <span className="text-xs text-slate-500">{formatDate(note.createdAt)}</span>
              {note.createdByName && (
                <span className="text-xs text-slate-500">by {note.createdByName}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-700">{note.note}</p>
          </div>
        ))}
    </div>
  );
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<DoctorVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DoctorVerificationStatus | "all">("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("overview");
  const [selected, setSelected] = useState<DoctorVerification | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<DoctorVerificationStatus>("pending");
  const [reviewNote, setReviewNote] = useState("");
  const [editableFields, setEditableFields] = useState<string[]>([]);
  const [editState, setEditState] = useState<EditState | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setDoctors(await getDoctorVerifications("all"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load doctors.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const specialtyOptions = useMemo(
    () => [...new Set(doctors.map((doctor) => doctor.specialization).filter(Boolean))].sort(),
    [doctors]
  );

  const stats = useMemo(
    () => ({
      total: doctors.length,
      approved: doctors.filter((doctor) => doctor.verificationStatus === "approved").length,
      pending: doctors.filter((doctor) => doctor.verificationStatus === "pending").length,
      review: doctors.filter((doctor) => doctor.verificationStatus === "in-review").length,
      rejected: doctors.filter((doctor) => doctor.verificationStatus === "rejected").length,
    }),
    [doctors]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return doctors.filter((doctor) => {
      if (statusFilter !== "all" && doctor.verificationStatus !== statusFilter) return false;
      if (specialtyFilter !== "all" && doctor.specialization !== specialtyFilter) return false;
      if (!term) return true;
      return [
        doctor.fullName,
        doctor.email,
        doctor.phone,
        doctor.specialization,
        doctor.licenseNumber,
        doctor.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [doctors, search, specialtyFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [search, statusFilter, specialtyFilter, pageSize]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function openPanel(doctorId: string, tab: PanelTab) {
    setPanelOpen(true);
    setPanelTab(tab);
    setPanelLoading(true);
    setPanelError("");
    try {
      const doctor = await getDoctorDetails(doctorId);
      setSelected(doctor);
      setEditState(toEditState(doctor));
      setReviewStatus(doctor.verificationStatus);
      setReviewNote(doctor.verificationNote || "");
      setEditableFields(doctor.editableFields || []);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Failed to load doctor details.");
    } finally {
      setPanelLoading(false);
    }
  }

  function syncDoctor(updated: DoctorVerification) {
    setDoctors((current) =>
      current.map((doctor) => (doctor._id === updated._id ? updated : doctor))
    );
    setSelected(updated);
    setEditState(toEditState(updated));
    setReviewStatus(updated.verificationStatus);
    setReviewNote(updated.verificationNote || "");
    setEditableFields(updated.editableFields || []);
  }

  async function saveDetails() {
    if (!selected || !editState) return;
    setSubmitting(true);
    setPanelError("");
    try {
      const updated = await updateDoctorDetails(selected._id, {
        ...editState,
        fullName: editState.fullName.trim(),
        email: editState.email.trim().toLowerCase(),
        phone: editState.phone.trim(),
        specialization: editState.specialization.trim(),
        experience: Number(editState.experience) || 0,
        qualification: editState.qualification.trim(),
        licenseNumber: editState.licenseNumber.trim(),
        consultationFee: Number(editState.consultationFee) || 0,
        hospitalName: (editState.hospitalName || "").trim(),
        hospitalAddress: (editState.hospitalAddress || "").trim(),
        city: (editState.city || "").trim(),
        about: (editState.about || "").trim(),
      });
      syncDoctor(updated);
      setPanelTab("overview");
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Failed to update doctor.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveReview() {
    if (!selected) return;
    setSubmitting(true);
    setPanelError("");
    try {
      const response = await updateDoctorVerification(selected._id, {
        verificationStatus: reviewStatus,
        verificationNote: reviewNote.trim() || undefined,
        editableFields,
      });
      syncDoctor(response.doctor);
      setReviewNote("");
      setPanelTab("overview");
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Failed to update review.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (
      !window.confirm(
        `Delete ${selected.fullName}? This removes the doctor and linked auth account.`
      )
    )
      return;
    setSubmitting(true);
    setPanelError("");
    try {
      await deleteDoctorRecord(selected._id);
      setDoctors((current) => current.filter((doctor) => doctor._id !== selected._id));
      setPanelOpen(false);
      setSelected(null);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Failed to delete doctor.");
    } finally {
      setSubmitting(false);
    }
  }

  const statCards = [
    { label: "Total", value: stats.total, icon: "👨‍⚕️", color: "bg-blue-50 border-blue-200", textColor: "text-blue-700", bgColor: "bg-blue-100" },
    { label: "Pending", value: stats.pending, icon: "⏳", color: "bg-amber-50 border-amber-200", textColor: "text-amber-700", bgColor: "bg-amber-100" },
    { label: "Approved", value: stats.approved, icon: "✓", color: "bg-emerald-50 border-emerald-200", textColor: "text-emerald-700", bgColor: "bg-emerald-100" },
    { label: "Rejected", value: stats.rejected, icon: "✕", color: "bg-rose-50 border-rose-200", textColor: "text-rose-700", bgColor: "bg-rose-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Doctor Management</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, icon, color, textColor, bgColor }) => (
            <div
              key={label}
              className={`rounded-lg border-2 ${color} p-4 transition hover:shadow-md hover:scale-105`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase ${textColor}`}>{label}</p>
                  <p className={`mt-3 text-3xl font-bold ${textColor}`}>{value}</p>
                </div>
                <div className={`${bgColor} rounded-full p-2 text-2xl`}>{icon}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Table Section */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">Doctors</h2>
          <div className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    statusFilter === item.value
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Search and Filters */}
            <div className="grid gap-3 lg:grid-cols-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search doctor, email, phone..."
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All Specialties</option>
                {specialtyOptions.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-600">No doctors found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Doctor</th>
                    <th className="px-6 py-4">Specialty</th>
                    <th className="px-6 py-4">City</th>
                    <th className="px-6 py-4">Fee</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.map((doctor) => (
                    <tr key={doctor._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">{doctor.fullName}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-xs text-slate-500">{doctor.email}</p>
                          <EmailVerificationBadge isVerified={doctor.isEmailVerified} />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <p className="font-medium">{doctor.specialization}</p>
                        <p className="text-xs text-slate-500">{doctor.experience} yrs</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {doctor.city || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {formatCurrency(doctor.consultationFee)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${badgeClass(
                            doctor.verificationStatus
                          )}`}
                        >
                          {doctor.verificationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void openPanel(doctor._id, "overview")}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium hover:bg-slate-100"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => void openPanel(doctor._id, "edit")}
                            className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void openPanel(doctor._id, "review")}
                            className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-medium text-white hover:bg-slate-800"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <p className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(page * pageSize, filtered.length)}
                </span>{" "}
                of <span className="font-semibold text-slate-900">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Side Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
          <div className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {selected?.fullName || "Doctor Details"}
              </h2>
              <div className="mt-4 flex gap-2">
                {(["overview", "edit", "review"] as PanelTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPanelTab(tab)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      panelTab === tab
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {tab === "overview" ? "Overview" : tab === "edit" ? "Edit" : "Review"}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {panelLoading ? (
                <div className="text-sm text-slate-600">Loading...</div>
              ) : panelError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {panelError}
                </div>
              ) : !selected ? (
                <div className="text-sm text-slate-600">Doctor details not available.</div>
              ) : (
                <>
                  {panelTab === "overview" && (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Full Name" value={selected.fullName} />
                        <Field label="Email" value={selected.email} />
                        <Field label="Phone" value={selected.phone} />
                        <Field label="Specialization" value={selected.specialization} />
                        <Field label="Qualification" value={selected.qualification} />
                        <Field label="Experience" value={`${selected.experience} years`} />
                        <Field label="License Number" value={selected.licenseNumber} />
                        <Field label="Fee" value={formatCurrency(selected.consultationFee)} />
                      </div>
                      <div>
                        <h3 className="mb-3 text-sm font-bold text-slate-900">Review History</h3>
                        <ReviewTimeline notes={selected.reviewNotes || []} />
                      </div>
                    </div>
                  )}

                  {panelTab === "edit" && editState && (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {[
                          ["fullName", "Full Name"],
                          ["email", "Email"],
                          ["phone", "Phone"],
                          ["specialization", "Specialization"],
                          ["experience", "Experience"],
                          ["qualification", "Qualification"],
                          ["licenseNumber", "License Number"],
                          ["consultationFee", "Consultation Fee"],
                          ["hospitalName", "Hospital Name"],
                          ["city", "City"],
                        ].map(([name, label]) => (
                          <div key={name}>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              {label}
                            </label>
                            <input
                              value={editState[name as keyof EditState] as string}
                              onChange={(e) =>
                                setEditState((current) =>
                                  current
                                    ? { ...current, [name]: e.target.value }
                                    : current
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Hospital Address
                        </label>
                        <textarea
                          value={editState.hospitalAddress}
                          onChange={(e) =>
                            setEditState((current) =>
                              current
                                ? { ...current, hospitalAddress: e.target.value }
                                : current
                            )
                          }
                          rows={3}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          About
                        </label>
                        <textarea
                          value={editState.about}
                          onChange={(e) =>
                            setEditState((current) =>
                              current ? { ...current, about: e.target.value } : current
                            )
                          }
                          rows={4}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button
                          type="button"
                          onClick={() => void saveDetails()}
                          disabled={submitting}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          {submitting ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditState(selected ? toEditState(selected) : null)
                          }
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {panelTab === "review" && (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Verification Status
                        </label>
                        <select
                          value={reviewStatus}
                          onChange={(e) => setReviewStatus(e.target.value as DoctorVerificationStatus)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                          <option value="pending">Pending</option>
                          <option value="in-review">In Review</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Allow Doctor to Edit
                        </label>
                        <div className="space-y-2">
                          {REVIEW_UNLOCKABLE_FIELDS.map((field) => (
                            <label
                              key={field}
                              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                            >
                              <input
                                type="checkbox"
                                checked={editableFields.includes(field)}
                                onChange={(e) =>
                                  setEditableFields((current) =>
                                    e.target.checked
                                      ? [...current, field]
                                      : current.filter((v) => v !== field)
                                  )
                                }
                                className="h-4 w-4 rounded"
                              />
                              <span className="text-sm text-slate-700">{field}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Review Notes
                        </label>
                        <textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          rows={4}
                          placeholder="Add review notes or reasons..."
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>

                      <div>
                        <h3 className="mb-3 text-sm font-bold text-slate-900">History</h3>
                        <ReviewTimeline notes={selected.reviewNotes || []} />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button
                          type="button"
                          onClick={() => void saveReview()}
                          disabled={submitting}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          {submitting ? "Saving..." : "Save Review"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete()}
                          disabled={submitting}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          {submitting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

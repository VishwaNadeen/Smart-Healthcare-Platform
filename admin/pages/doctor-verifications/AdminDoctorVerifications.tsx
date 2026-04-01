import { useEffect, useState } from "react";
import {
  getDoctorVerifications,
  updateDoctorApprovalStatus,
  updateDoctorVerification,
  type DoctorVerification,
  type DoctorVerificationStatus,
} from "../../services/adminApi";

const FILTERS: Array<{ label: string; value: DoctorVerificationStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function formatDate(value?: string | null) {
  if (!value) {
    return "Not reviewed yet";
  }

  return new Date(value).toLocaleString();
}

function getStatusClass(status: DoctorVerificationStatus) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default function AdminDoctorVerifications() {
  const [filter, setFilter] = useState<DoctorVerificationStatus | "all">("pending");
  const [doctors, setDoctors] = useState<DoctorVerification[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDoctors() {
      setLoading(true);
      setError("");

      try {
        const data = await getDoctorVerifications(filter);
        setDoctors(data);
        setNotes(
          Object.fromEntries(
            data.map((doctor) => [doctor._id, doctor.verificationNote || ""])
          )
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load doctor verifications."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDoctors();
  }, [filter]);

  async function handleVerificationAction(
    doctorId: string,
    verificationStatus: "approved" | "rejected"
  ) {
    setSubmittingId(doctorId);
    setError("");

    try {
      const currentDoctor = doctors.find((doctor) => doctor._id === doctorId);

      if (!currentDoctor?.authUserId) {
        throw new Error("Missing auth user id for this doctor");
      }

      const response = await updateDoctorVerification(doctorId, {
        verificationStatus,
        verificationNote: notes[doctorId]?.trim() || undefined,
      });

      try {
        await updateDoctorApprovalStatus(currentDoctor.authUserId, {
          doctorApprovalStatus: verificationStatus,
        });
      } catch (authError) {
        await updateDoctorVerification(doctorId, {
          verificationStatus: currentDoctor.verificationStatus,
          verificationNote: currentDoctor.verificationNote || undefined,
        });
        throw authError;
      }

      setDoctors((current) =>
        current.map((doctor) =>
          doctor._id === doctorId ? response.doctor : doctor
        )
      );
      setNotes((current) => ({
        ...current,
        [doctorId]: response.doctor.verificationNote || "",
      }));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to update doctor verification."
      );
    } finally {
      setSubmittingId("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Doctor Verifications
            </h2>
            <p className="mt-2 text-slate-600">
              Review doctor registrations and approve them before doctor login
              is allowed.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === item.value
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            Loading doctor verification requests...
          </div>
        ) : doctors.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            No doctor registrations found for the selected filter.
          </div>
        ) : (
          doctors.map((doctor) => {
            const isSubmitting = submittingId === doctor._id;

            return (
              <article
                key={doctor._id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-900">
                        {doctor.fullName}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClass(
                          doctor.verificationStatus
                        )}`}
                      >
                        {doctor.verificationStatus}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                      <p>
                        <span className="font-semibold text-slate-800">Email:</span>{" "}
                        {doctor.email}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Phone:</span>{" "}
                        {doctor.phone}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">
                          Specialty:
                        </span>{" "}
                        {doctor.specialization}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">
                          Qualification:
                        </span>{" "}
                        {doctor.qualification}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">
                          Experience:
                        </span>{" "}
                        {doctor.experience} years
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">
                          License:
                        </span>{" "}
                        {doctor.licenseNumber}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">
                          Consultation Fee:
                        </span>{" "}
                        {doctor.consultationFee ?? "Not set"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">
                          Hospital:
                        </span>{" "}
                        {doctor.hospitalName || "Not provided"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">City:</span>{" "}
                        {doctor.city || "Not provided"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">
                          Registered:
                        </span>{" "}
                        {formatDate(doctor.createdAt)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">
                          Reviewed:
                        </span>{" "}
                        {formatDate(doctor.verifiedAt)}
                      </p>
                    </div>

                    {doctor.about && (
                      <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                        {doctor.about}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Verification Note
                  </label>
                  <textarea
                    value={notes[doctor._id] || ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [doctor._id]: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Add an approval note or rejection reason"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleVerificationAction(doctor._id, "approved")
                    }
                    disabled={isSubmitting}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving..." : "Approve Doctor"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleVerificationAction(doctor._id, "rejected")
                    }
                    disabled={isSubmitting}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving..." : "Reject Doctor"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

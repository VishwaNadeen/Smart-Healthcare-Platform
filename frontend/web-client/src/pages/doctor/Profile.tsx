import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/ToastProvider";
import {
  deleteCurrentDoctor,
  getCurrentDoctorProfile,
  removeDoctorProfileImage,
  uploadDoctorProfileImage,
  updateCurrentDoctorProfile,
} from "../../services/doctorApi";
import type {
  DoctorAvailabilityScheduleItem,
  DoctorProfile,
} from "../../services/doctorApi";
import {
  clearTelemedicineAuth,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";

type FormState = {
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
  profileImage: string;
  about: string;
  availableDays: string[];
  availableTimeSlots: string[];
  isAvailableForVideo: boolean;
  supportsDigitalPrescriptions: boolean;
  acceptsNewAppointments: boolean;
  availabilitySchedule: DoctorAvailabilityScheduleItem[];
};

function emptyForm(): FormState {
  return {
    fullName: "",
    email: "",
    phone: "",
    specialization: "",
    experience: "",
    qualification: "",
    licenseNumber: "",
    hospitalName: "",
    hospitalAddress: "",
    city: "",
    consultationFee: "",
    profileImage: "",
    about: "",
    availableDays: [],
    availableTimeSlots: [],
    isAvailableForVideo: false,
    supportsDigitalPrescriptions: true,
    acceptsNewAppointments: true,
    availabilitySchedule: [],
  };
}

function fieldClass(readOnly = false) {
  return `w-full rounded-2xl border px-4 py-3.5 outline-none transition ${
    readOnly
      ? "border-slate-200 bg-slate-100 text-slate-500"
      : "border-slate-200 bg-white text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
  }`;
}

function buildAvailabilitySummary(schedule: DoctorAvailabilityScheduleItem[]) {
  const completeSlots = schedule.filter(
    (slot) => slot.day && slot.startTime && slot.endTime
  );

  return {
    availableDays: [...new Set(completeSlots.map((slot) => slot.day))],
    availableTimeSlots: [
      ...new Set(
        completeSlots.map((slot) => `${slot.startTime}-${slot.endTime}`)
      ),
    ],
  };
}

function OverviewCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold capitalize">{value || "-"}</p>
    </div>
  );
}

export default function DoctorProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const auth = getStoredTelemedicineAuth();
  const token = auth.token || "";

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const initials = useMemo(() => {
    const fullName = formData.fullName.trim();
    if (!fullName) return "D";
    return fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }, [formData.fullName]);

  const scheduleSummary = useMemo(
    () =>
      formData.availabilitySchedule
        .filter((slot) => slot.day && slot.startTime && slot.endTime)
        .map((slot) => {
          const mode =
            slot.mode === "in_person"
              ? "In Person"
              : slot.mode === "video"
              ? "Video"
              : "Both";
          return `${slot.day} • ${slot.startTime}-${slot.endTime} • ${mode} • max ${slot.maxAppointments}`;
        }),
    [formData.availabilitySchedule]
  );

  const availabilitySummary = useMemo(
    () => buildAvailabilitySummary(formData.availabilitySchedule),
    [formData.availabilitySchedule]
  );

  const applyProfile = (profile: DoctorProfile) => {
    const derivedAvailabilitySummary = buildAvailabilitySummary(
      profile.availabilitySchedule || []
    );
    const availableDays =
      derivedAvailabilitySummary.availableDays.length > 0
        ? derivedAvailabilitySummary.availableDays
        : profile.availableDays || [];
    const availableTimeSlots =
      derivedAvailabilitySummary.availableTimeSlots.length > 0
        ? derivedAvailabilitySummary.availableTimeSlots
        : profile.availableTimeSlots || [];

    setDoctorProfile(profile);
    setFormData({
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      specialization: profile.specialization || "",
      experience:
        profile.experience !== undefined ? String(profile.experience) : "",
      qualification: profile.qualification || "",
      licenseNumber: profile.licenseNumber || "",
      hospitalName: profile.hospitalName || "",
      hospitalAddress: profile.hospitalAddress || "",
      city: profile.city || "",
      consultationFee:
        profile.consultationFee !== undefined ? String(profile.consultationFee) : "",
      profileImage: profile.profileImage || "",
      about: profile.about || "",
      availableDays,
      availableTimeSlots,
      isAvailableForVideo: Boolean(profile.isAvailableForVideo),
      supportsDigitalPrescriptions: profile.supportsDigitalPrescriptions !== false,
      acceptsNewAppointments: profile.acceptsNewAppointments !== false,
      availabilitySchedule: profile.availabilitySchedule || [],
    });
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const data = await getCurrentDoctorProfile(token);
      applyProfile(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load doctor profile";
      if (
        message.toLowerCase().includes("unauthorized") ||
        message.toLowerCase().includes("invalid token")
      ) {
        clearTelemedicineAuth();
        navigate("/login", { replace: true });
        return;
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setErrorMessage("Please login first.");
      setLoading(false);
      return;
    }
    void loadProfile();
  }, [token]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;
    const target = event.target;

    if (type === "checkbox" && target instanceof HTMLInputElement) {
      setFormData((prev) => ({ ...prev, [name]: target.checked }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSuccessMessage("");
      setErrorMessage("");
      const summary = buildAvailabilitySummary(formData.availabilitySchedule);
      const response = await updateCurrentDoctorProfile(token, {
        ...formData,
        availableDays: summary.availableDays,
        availableTimeSlots: summary.availableTimeSlots,
        experience: Number(formData.experience) || 0,
        consultationFee: Number(formData.consultationFee) || 0,
        availabilitySchedule: formData.availabilitySchedule,
      });
      applyProfile(response);
      setSuccessMessage("Doctor profile updated successfully.");
      showToast("Doctor profile updated successfully.", "success");
      setEditing(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update doctor profile";
      setErrorMessage(message);
      showToast(message, "error");
    }
  };

  const handleProfileImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setUploadingImage(true);
      const response = await uploadDoctorProfileImage(token, file);
      applyProfile(response.doctor);
      URL.revokeObjectURL(previewUrl);
      setImagePreview("");
      setSuccessMessage("Doctor profile photo updated successfully.");
      showToast("Doctor profile photo updated successfully.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload doctor profile image";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleRemoveProfileImage = async () => {
    try {
      setUploadingImage(true);
      const doctor = await removeDoctorProfileImage(token);
      applyProfile(doctor);
      setImagePreview("");
      setSuccessMessage("Doctor profile photo removed successfully.");
      showToast("Doctor profile photo removed successfully.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove doctor profile image";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      const response = await deleteCurrentDoctor(token);
      showToast(response.message || "Doctor account deleted successfully.", "success");
      clearTelemedicineAuth();
      navigate("/", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete doctor profile";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setDeleting(false);
      setShowDeletePrompt(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-lg font-semibold text-slate-700">
          Loading doctor profile...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#f8fafc_42%,_#eef2ff)] px-4 py-10">
      {showDeletePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-red-800">Delete Doctor Profile</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This will remove the doctor profile from the doctor-service. This action
              cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
              >
                {deleting ? "Deleting..." : "Delete Profile"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeletePrompt(false)}
                className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <section className="bg-[linear-gradient(160deg,_#1d4ed8,_#2563eb_50%,_#0f172a_140%)] px-8 py-10 text-white md:px-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              {imagePreview || formData.profileImage ? (
                <img
                  src={imagePreview || formData.profileImage}
                  alt="Doctor profile"
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-white/35"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 text-3xl font-bold text-white ring-4 ring-white/30">
                  {initials}
                </div>
              )}

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-blue-100">
                  Doctor Service
                </p>
                <h1 className="mt-3 text-4xl font-bold leading-tight">
                  {formData.fullName || "Doctor Profile"}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-blue-100/95">
                  This page now focuses on doctor-service profile details. Booking
                  availability has its own dedicated doctor menu page.
                </p>
              </div>
            </div>

            {!editing && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-2xl bg-white px-6 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeletePrompt(true)}
                  className="rounded-2xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-8 p-8 lg:grid-cols-[320px_1fr] lg:p-10">
          <aside className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Account State
              </p>
              <div className="mt-5 space-y-3">
                <OverviewCard
                  label="Verification"
                  value={doctorProfile?.verificationStatus || "pending"}
                  tone={
                    doctorProfile?.verificationStatus === "approved"
                      ? "success"
                      : "warning"
                  }
                />
                <OverviewCard
                  label="Account Status"
                  value={doctorProfile?.status || "inactive"}
                  tone={
                    doctorProfile?.status === "active" ? "success" : "warning"
                  }
                />
                <OverviewCard
                  label="Appointments"
                  value={
                    formData.acceptsNewAppointments ? "Accepting new patients" : "Paused"
                  }
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Availability Snapshot
              </p>
              <div className="mt-5 space-y-4 text-sm text-slate-700">
                <div>
                  <p className="font-semibold text-slate-900">Available Days</p>
                  <p className="mt-1 leading-6">
                    {availabilitySummary.availableDays.length > 0
                      ? availabilitySummary.availableDays.join(", ")
                      : "No days configured yet."}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Time Slots</p>
                  <p className="mt-1 leading-6">
                    {availabilitySummary.availableTimeSlots.length > 0
                      ? availabilitySummary.availableTimeSlots.join(", ")
                      : "No time slots configured yet."}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Video Sessions</p>
                  <p className="mt-1 leading-6">
                    {formData.isAvailableForVideo
                      ? "Video consultations enabled"
                      : "Video consultations disabled"}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <main>
            {!editing ? (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                        Profile
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-slate-900">
                        Professional Details
                      </h2>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Full Name
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.fullName || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Email
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.email || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Phone
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.phone || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Specialization
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.specialization || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Experience
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.experience ? `${formData.experience} years` : "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Consultation Fee
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.consultationFee || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Qualification
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.qualification || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        License Number
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.licenseNumber || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Hospital
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.hospitalName || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        City
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.city || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Hospital Address
                      </p>
                      <p className="mt-2 text-base font-semibold text-slate-900">
                        {formData.hospitalAddress || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        About
                      </p>
                      <p className="mt-2 text-base leading-7 text-slate-700">
                        {formData.about || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                        Availability
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-slate-900">
                        Booking Schedule
                      </h2>
                    </div>

                    <Link
                      to="/doctor/availability"
                      className="rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Manage Availability
                    </Link>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Available Days
                      </p>
                      <p className="mt-2 text-base text-slate-800">
                        {availabilitySummary.availableDays.length > 0
                          ? availabilitySummary.availableDays.join(", ")
                          : "No days configured yet."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Available Time Slots
                      </p>
                      <p className="mt-2 text-base text-slate-800">
                        {availabilitySummary.availableTimeSlots.length > 0
                          ? availabilitySummary.availableTimeSlots.join(", ")
                          : "No time slots configured yet."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Schedule Details
                      </p>
                      {scheduleSummary.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {scheduleSummary.map((item) => (
                            <div
                              key={item}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-base text-slate-800">
                          No detailed schedule configured yet.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <OverviewCard
                        label="Video"
                        value={formData.isAvailableForVideo ? "Enabled" : "Disabled"}
                      />
                      <OverviewCard
                        label="Digital Prescriptions"
                        value={
                          formData.supportsDigitalPrescriptions ? "Enabled" : "Disabled"
                        }
                      />
                      <OverviewCard
                        label="Accepting Appointments"
                        value={formData.acceptsNewAppointments ? "Yes" : "No"}
                      />
                    </div>

                    <p className="text-sm leading-6 text-slate-500">
                      Use the dedicated availability page to add, edit, or remove
                      booking slots.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 md:p-7">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                    Profile
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    Edit Professional Details
                  </h2>

                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Full Name
                      </label>
                      <input
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className={fieldClass()}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Email
                      </label>
                      <input value={formData.email} readOnly className={fieldClass(true)} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Phone
                      </label>
                      <input
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={fieldClass()}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Specialization
                      </label>
                      <input
                        value={formData.specialization}
                        readOnly
                        className={fieldClass(true)}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Experience
                      </label>
                      <input
                        type="number"
                        name="experience"
                        value={formData.experience}
                        onChange={handleChange}
                        className={fieldClass()}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Consultation Fee
                      </label>
                      <input
                        type="number"
                        name="consultationFee"
                        value={formData.consultationFee}
                        onChange={handleChange}
                        className={fieldClass()}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Qualification
                      </label>
                      <input
                        name="qualification"
                        value={formData.qualification}
                        onChange={handleChange}
                        className={fieldClass()}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        License Number
                      </label>
                      <input
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleChange}
                        className={fieldClass()}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Hospital Name
                      </label>
                      <input
                        name="hospitalName"
                        value={formData.hospitalName}
                        onChange={handleChange}
                        className={fieldClass()}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        City
                      </label>
                      <input
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className={fieldClass()}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Hospital Address
                      </label>
                      <textarea
                        name="hospitalAddress"
                        value={formData.hospitalAddress}
                        onChange={handleChange}
                        rows={3}
                        className={fieldClass()}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Profile Photo
                      </label>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-sm text-slate-400">
                            {imagePreview || formData.profileImage ? (
                              <img
                                src={imagePreview || formData.profileImage}
                                alt="Doctor profile preview"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="px-2 text-center">Doctor photo</span>
                            )}
                          </div>

                          <div className="flex-1 space-y-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProfileImageUpload}
                              disabled={uploadingImage}
                              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700 disabled:opacity-70"
                            />
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={handleRemoveProfileImage}
                                disabled={uploadingImage || !formData.profileImage}
                                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Remove Photo
                              </button>
                              <p className="text-xs leading-5 text-slate-500">
                                Stored through doctor-service using Cloudinary.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        About
                      </label>
                      <textarea
                        name="about"
                        value={formData.about}
                        onChange={handleChange}
                        rows={4}
                        className={fieldClass()}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                        Availability
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-slate-900">
                        Manage Booking Schedule
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                        Keep this section up to date so appointment-service can reflect the
                        doctor’s latest availability and booking preferences.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <p className="max-w-2xl text-sm leading-7 text-slate-500">
                      Schedule editing has been moved out of the doctor profile page.
                      Open the dedicated availability route from the doctor menu to
                      manage booking slots and appointment preferences.
                    </p>

                    <div>
                      <Link
                        to="/doctor/availability"
                        className="inline-flex rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                      >
                        Open Availability Page
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setSuccessMessage("");
                      setErrorMessage("");
                      if (doctorProfile) applyProfile(doctorProfile);
                    }}
                    className="rounded-2xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {successMessage && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            {errorMessage && !loading && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/toastContext";
import {
  deleteCurrentDoctor,
  getCurrentDoctorProfile,
  removeDoctorProfileImage,
  uploadDoctorProfileImage,
  updateCurrentDoctorProfile,
} from "../../services/doctorApi";
import type {
  DoctorAvailabilityException,
  DoctorAvailabilityScheduleItem,
  DoctorProfile,
  DoctorReviewNote,
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
  appointmentDurationMinutes: number;
  profileImage: string;
  about: string;
  availableDays: string[];
  availableTimeSlots: string[];
  acceptsNewAppointments: boolean;
  availabilitySchedule: DoctorAvailabilityScheduleItem[];
  availabilityExceptions: DoctorAvailabilityException[];
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
    appointmentDurationMinutes: 15,
    profileImage: "",
    about: "",
    availableDays: [],
    availableTimeSlots: [],
    acceptsNewAppointments: true,
    availabilitySchedule: [],
    availabilityExceptions: [],
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

function DoctorProfileItem({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <p className="mt-3 text-base font-semibold text-slate-900">{value || "-"}</p>
      </div>
    </div>
  );
}

function formatReviewDate(value?: string) {
  if (!value) {
    return "Recently";
  }

  return new Date(value).toLocaleString();
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

  const verificationStatus = doctorProfile?.verificationStatus || "pending";
  const editableFields = doctorProfile?.editableFields || [];
  const isApproved = verificationStatus === "approved";
  const canEditProfile =
    isApproved || editableFields.length > 0;
  const isProfileLocked = !canEditProfile;
  const reviewNotes = (doctorProfile?.reviewNotes || []) as DoctorReviewNote[];

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

  const canEditField = (fieldName: keyof FormState) =>
    fieldName === "licenseNumber"
      ? editableFields.includes("licenseNumber")
      : verificationStatus === "approved" ||
        editableFields.includes(String(fieldName));

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
      appointmentDurationMinutes: profile.appointmentDurationMinutes || 15,
      profileImage: profile.profileImage || "",
      about: profile.about || "",
      availableDays,
      availableTimeSlots,
      acceptsNewAppointments: profile.acceptsNewAppointments !== false,
      availabilitySchedule: profile.availabilitySchedule || [],
      availabilityExceptions: profile.availabilityExceptions || [],
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

  useEffect(() => {
    if (!canEditProfile && editing) {
      setEditing(false);
    }
  }, [canEditProfile, editing]);

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
    if (!canEditProfile) {
      return;
    }
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
        appointmentDurationMinutes: formData.appointmentDurationMinutes || 15,
        availabilitySchedule: formData.availabilitySchedule,
        availabilityExceptions: formData.availabilityExceptions,
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
    if (!isApproved) {
      event.target.value = "";
      return;
    }
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
    if (!isApproved) {
      return;
    }
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
    if (!isApproved) {
      return;
    }
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

  const noticeClassName =
    verificationStatus === "rejected"
      ? "mx-auto mb-6 max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-center text-red-800"
      : "mx-auto mb-6 max-w-3xl rounded-2xl border border-yellow-200 bg-yellow-50 px-6 py-4 text-center text-yellow-800";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#f8fafc_42%,_#eef2ff)] px-4 py-10">
      {isProfileLocked && (
        <div className={noticeClassName}>
          {verificationStatus === "pending" && (
            <span>
              Your profile is <b>pending</b> admin approval. You cannot edit or delete
              your profile until it is approved.
            </span>
          )}
          {verificationStatus === "in-review" && (
            <span>
              Your profile is <b>under review</b> by admin. You cannot edit or delete
              your profile until it is approved.
            </span>
          )}
          {verificationStatus === "rejected" && (
            <span>
              Your profile was <b>rejected</b>. Review the admin notes below for
              corrections before resubmitting your details.
            </span>
          )}
        </div>
      )}
      {!isApproved && editableFields.length > 0 && (
        <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-sky-200 bg-sky-50 px-6 py-4 text-center text-sky-800">
          Admin has temporarily unlocked these fields for correction:{" "}
          <b>{editableFields.join(", ")}</b>.
        </div>
      )}
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

      <div className="mx-auto max-w-6xl space-y-4">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-white">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                {imagePreview || formData.profileImage ? (
                  <img
                    src={imagePreview || formData.profileImage}
                    alt="Doctor profile"
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-white/40"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-3xl font-bold text-white ring-4 ring-white/30">
                    {initials}
                  </div>
                )}

                <div>
                  <h1 className="text-3xl font-bold">
                    {formData.fullName || "Doctor Profile"}
                  </h1>
                  <p className="mt-2 text-blue-100">
                    Manage your professional details and practice information
                  </p>
                </div>
              </div>

              {!editing && canEditProfile && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    {isApproved ? "Edit Profile" : "Respond To Review"}
                  </button>
                  {isApproved && (
                    <button
                      type="button"
                      onClick={() => setShowDeletePrompt(true)}
                      className="rounded-xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      Delete Account
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-8 p-8 lg:grid-cols-[320px_1fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-lg font-bold text-slate-800">Profile Picture</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload a photo to personalize your doctor account.
              </p>

              <div className="mt-6 flex flex-col items-center">
                {imagePreview || formData.profileImage ? (
                  <img
                    src={imagePreview || formData.profileImage}
                    alt="Doctor profile"
                    className="h-36 w-36 rounded-full object-cover ring-4 ring-blue-100"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold text-white ring-4 ring-blue-100">
                    {initials}
                  </div>
                )}

                <div className="mt-5 flex w-full flex-col gap-3">
                  <label
                    className={`cursor-pointer rounded-xl px-4 py-3 text-center text-sm font-semibold text-white transition ${
                      !isApproved || uploadingImage
                        ? "bg-blue-400"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {formData.profileImage ? "Change Picture" : "Upload Picture"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      disabled={uploadingImage || !isApproved}
                      className="hidden"
                    />
                  </label>

                  {formData.profileImage && (
                    <button
                      type="button"
                      onClick={handleRemoveProfileImage}
                      disabled={uploadingImage || !isApproved}
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove Picture
                    </button>
                  )}

                  </div>
                </div>
            </div>

            <div>
              {!editing ? (
                <div className="space-y-6">
                  {!isApproved && reviewNotes.length > 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6">
                      <h2 className="text-lg font-bold text-slate-900">
                        Review Notes
                      </h2>
                      <div className="mt-4 space-y-3">
                        {reviewNotes
                          .slice()
                          .reverse()
                          .map((entry, index) => (
                            <div
                              key={`${entry.createdAt || "note"}-${index}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  {entry.status}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {formatReviewDate(entry.createdAt)}
                                </span>
                                {entry.createdByName && (
                                  <span className="text-xs text-slate-500">
                                    by {entry.createdByName}
                                  </span>
                                )}
                              </div>
                              <p className="mt-3 text-sm leading-6 text-slate-700">
                                {entry.note}
                              </p>
                              {entry.editableFields &&
                                entry.editableFields.length > 0 && (
                                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-sky-700">
                                    Editable: {entry.editableFields.join(", ")}
                                  </p>
                                )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <DoctorProfileItem label="Full Name" value={formData.fullName} />
                    <DoctorProfileItem label="Email" value={formData.email} />
                    <DoctorProfileItem label="Phone" value={formData.phone} />
                    <DoctorProfileItem
                      label="Specialization"
                      value={formData.specialization}
                    />
                    <DoctorProfileItem
                      label="Experience"
                      value={formData.experience ? `${formData.experience} years` : "-"}
                    />
                    <DoctorProfileItem
                      label="Consultation Fee"
                      value={formData.consultationFee}
                    />
                    <DoctorProfileItem
                      label="Qualification"
                      value={formData.qualification}
                    />
                    <DoctorProfileItem
                      label="License Number"
                      value={formData.licenseNumber}
                    />
                    <DoctorProfileItem
                      label="Hospital Name"
                      value={formData.hospitalName}
                    />
                    <DoctorProfileItem label="City" value={formData.city} />
                    <DoctorProfileItem
                      label="Hospital Address"
                      value={formData.hospitalAddress}
                      full
                    />
                    <DoctorProfileItem label="About" value={formData.about} full />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSave} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Full Name
                      </label>
                      <input
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        readOnly={!canEditField("fullName")}
                        className={fieldClass(!canEditField("fullName"))}
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
                        readOnly={!canEditField("phone")}
                        className={fieldClass(!canEditField("phone"))}
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
                        readOnly={!canEditField("experience")}
                        className={fieldClass(!canEditField("experience"))}
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
                        readOnly={!canEditField("consultationFee")}
                        className={fieldClass(!canEditField("consultationFee"))}
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
                        readOnly={!canEditField("qualification")}
                        className={fieldClass(!canEditField("qualification"))}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        License Number
                      </label>
                      <input
                        name="licenseNumber"
                        onChange={handleChange}
                        value={formData.licenseNumber}
                        readOnly={!canEditField("licenseNumber")}
                        className={fieldClass(!canEditField("licenseNumber"))}
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
                        readOnly={!canEditField("hospitalName")}
                        className={fieldClass(!canEditField("hospitalName"))}
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
                        readOnly={!canEditField("city")}
                        className={fieldClass(!canEditField("city"))}
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
                        readOnly={!canEditField("hospitalAddress")}
                        className={fieldClass(!canEditField("hospitalAddress"))}
                      />
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
                        readOnly={!canEditField("about")}
                        className={fieldClass(!canEditField("about"))}
                      />
                    </div>
                  <div className="md:col-span-2 flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isProfileLocked}
                    className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


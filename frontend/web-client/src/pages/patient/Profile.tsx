import { useEffect, useRef, useState } from "react";
import {
  deleteCurrentPatient,
  getCurrentPatientProfile,
  removeCurrentPatientProfileImage,
  uploadCurrentPatientProfileImage,
  updateCurrentPatientProfile,
} from "../../services/patientApi";
import type { PatientUpdatePayload } from "../../services/patientApi";
import {
  clearTelemedicineAuth,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/ToastProvider";

const PROFILE_NAME_KEY = "patientProfileName";

const PatientProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState<PatientUpdatePayload>({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+94",
    phone: "",
    birthday: "",
    gender: "",
    address: "",
    country: "",
  });

  const [profileImage, setProfileImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const auth = getStoredTelemedicineAuth();
  const token = auth.token || "";

  useEffect(() => {
    localStorage.removeItem("patientProfileImage");
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getCurrentPatientProfile(token);

      const nextForm = {
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || "",
        countryCode: data.countryCode || "+94",
        phone: data.phone || "",
        birthday: data.birthday
          ? new Date(data.birthday).toISOString().split("T")[0]
          : "",
        gender: data.gender || "",
        address: data.address || "",
        country: data.country || "",
      };

      setFormData(nextForm);

      const fullName = `${nextForm.firstName} ${nextForm.lastName}`.trim();
      localStorage.setItem(PROFILE_NAME_KEY, fullName);
      setProfileImage(data.profileImage || "");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load profile";
      const normalizedMessage = message.toLowerCase();

      if (
        normalizedMessage.includes("not found") ||
        normalizedMessage.includes("deleted") ||
        normalizedMessage.includes("unauthorized") ||
        normalizedMessage.includes("invalid token")
      ) {
        localStorage.removeItem(PROFILE_NAME_KEY);
        clearTelemedicineAuth();
        navigate("/login", {
          replace: true,
          state: {
            registeredEmail: auth.email || "",
            successMessage:
              "Your patient account was deleted or is no longer available. Please sign in with a valid account.",
          },
        });
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

    loadProfile();
  }, [token]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleChooseImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose a valid image file.");
      showToast("Please choose a valid image file.", "error");
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");

      const response = await uploadCurrentPatientProfileImage(token, file);

      setProfileImage(response.profileImage || response.patient.profileImage || "");
      setSuccessMessage(response.message || "Profile picture updated successfully.");
      setErrorMessage("");
      showToast(response.message || "Profile picture updated successfully.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload profile picture";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    void (async () => {
      try {
        setSuccessMessage("");
        setErrorMessage("");

        const response = await removeCurrentPatientProfileImage(token);

        setProfileImage("");
        setSuccessMessage(response.message || "Profile picture removed.");
        showToast(response.message || "Profile picture removed.", "info");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to remove profile picture";
        setErrorMessage(message);
        showToast(message, "error");
      }
    })();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSuccessMessage("");
      setErrorMessage("");

      const response = await updateCurrentPatientProfile(token, formData);

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      localStorage.setItem(PROFILE_NAME_KEY, fullName);

      setSuccessMessage(response.message || "Profile updated successfully.");
      showToast(response.message || "Profile updated successfully.", "success");
      setEditing(false);
      await loadProfile();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      setErrorMessage(message);
      showToast(message, "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) {
      setErrorMessage("Please login first.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setSuccessMessage("");
      setErrorMessage("");

      const response = await deleteCurrentPatient(token);
      showToast(
        response.message || "Your account was deleted successfully.",
        "success"
      );

      localStorage.removeItem(PROFILE_NAME_KEY);
      clearTelemedicineAuth();

      navigate("/", {
        replace: true,
        state: {
          successMessage:
            response.message || "Your account was deleted successfully.",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete account";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const fullName = `${formData.firstName} ${formData.lastName}`.trim();
  const initials = `${formData.firstName?.[0] || ""}${formData.lastName?.[0] || ""}`.toUpperCase() || "P";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg font-semibold text-slate-700">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-white/40"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-3xl font-bold text-white ring-4 ring-white/30">
                  {initials}
                </div>
              )}

              <div>
                <h1 className="text-3xl font-bold">{fullName || "Patient Profile"}</h1>
                <p className="mt-2 text-blue-100">Manage your personal details and account</p>
              </div>
            </div>

            {!editing && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  Edit Profile
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="rounded-xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-70"
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 p-8 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-lg font-bold text-slate-800">Profile Picture</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload a photo to personalize your account.
            </p>

            <div className="mt-6 flex flex-col items-center">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-36 w-36 rounded-full object-cover ring-4 ring-blue-100"
                />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold text-white ring-4 ring-blue-100">
                  {initials}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              <div className="mt-5 flex w-full flex-col gap-3">
                <button
                  type="button"
                  onClick={handleChooseImage}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {profileImage ? "Change Picture" : "Upload Picture"}
                </button>

                {profileImage && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Remove Picture
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            {successMessage && (
              <div className="mb-5 rounded-xl bg-green-100 px-4 py-3 text-green-700">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 rounded-xl bg-red-100 px-4 py-3 text-red-700">
                {errorMessage}
              </div>
            )}

            {!editing ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <ProfileItem label="First Name" value={formData.firstName} />
                <ProfileItem label="Last Name" value={formData.lastName} />
                <ProfileItem label="Email" value={formData.email} />
                <ProfileItem
                  label="Phone"
                  value={`${formData.countryCode} ${formData.phone}`}
                />
                <ProfileItem label="Birthday" value={formData.birthday} />
                <ProfileItem label="Gender" value={formData.gender} />
                <ProfileItem label="Country" value={formData.country} />
                <ProfileItem label="Address" value={formData.address} full />
              </div>
            ) : (
              <form onSubmit={handleSave} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />

                <InputField
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />

                <InputField
                  label="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  readOnly
                  helperText="Email is managed by your account and cannot be changed here."
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Phone
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleChange}
                      className="w-24 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      required
                    />
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <InputField
                  label="Birthday"
                  name="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={handleChange}
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <InputField
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                />

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2 flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setSuccessMessage("");
                      setErrorMessage("");
                      loadProfile();
                    }}
                    className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileItem = ({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) => {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 min-h-[56px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800">
        {value || "-"}
      </div>
    </div>
  );
};

const InputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  readOnly = false,
  helperText = "",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  type?: string;
  readOnly?: boolean;
  helperText?: string;
}) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full rounded-xl border border-slate-300 px-4 py-3 outline-none ${
          readOnly
            ? "cursor-not-allowed bg-slate-100 text-slate-500"
            : "focus:border-blue-500"
        }`}
        required={name !== "address"}
      />
      {helperText && (
        <p className="mt-2 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
};

export default PatientProfile;

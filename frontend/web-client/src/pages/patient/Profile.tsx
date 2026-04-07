import { useEffect, useRef, useState } from "react";
import {
  deleteCurrentPatient,
  getCurrentPatientProfile,
  PatientApiError,
  removeCurrentPatientProfileImage,
  uploadCurrentPatientProfileImage,
  updateCurrentPatientProfile,
} from "../../services/patientApi";
import type { PatientUpdatePayload } from "../../services/patientApi";
import {
  clearTelemedicineAuth,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";
import { defaultCountries } from "react-international-phone";
import { useNavigate } from "react-router-dom";
import PhoneNumberInput from "../../components/common/PhoneNumberInput";
import PasswordField from "../../components/common/PasswordField";
import { useToast } from "../../components/common/toastContext";

const PROFILE_NAME_KEY = "patientProfileName";
const PROFILE_IMAGE_KEY = "patientProfileImage";
const PROFILE_UPDATED_EVENT = "patient-profile-updated";

type FormErrors = Partial<Record<keyof PatientUpdatePayload, string>>;

const NAME_PATTERN = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const NIC_PATTERN = /^(?:\d{9}[VvXx]|\d{12})$/;
const COUNTRY_CODE_PATTERN = /^\+[1-9]\d{0,3}$/;
const PHONE_PATTERN = /^\d{7,15}$/;
const COUNTRY_PATTERN = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const COUNTRY_OPTIONS = Array.from(
  new Set(defaultCountries.map((country) => country[0] as string))
).sort((firstCountry, secondCountry) =>
  firstCountry.localeCompare(secondCountry)
);

function validateProfileField(
  field: keyof PatientUpdatePayload,
  value: string,
  data: PatientUpdatePayload
): string {
  const trimmedValue = value.trim();

  switch (field) {
    case "title":
      if (!data.title) return "Title is required.";
      return "";
    case "firstName":
      if (!trimmedValue) return "First name is required.";
      if (trimmedValue.length < 2) return "First name must be at least 2 characters.";
      if (trimmedValue.length > 50) return "First name must be 50 characters or fewer.";
      if (!NAME_PATTERN.test(trimmedValue)) {
        return "First name can contain only letters, spaces, apostrophes, and hyphens.";
      }
      return "";
    case "lastName":
      if (!trimmedValue) return "Last name is required.";
      if (trimmedValue.length < 2) return "Last name must be at least 2 characters.";
      if (trimmedValue.length > 50) return "Last name must be 50 characters or fewer.";
      if (!NAME_PATTERN.test(trimmedValue)) {
        return "Last name can contain only letters, spaces, apostrophes, and hyphens.";
      }
      return "";
    case "nic":
      if (!trimmedValue) return "NIC is required.";
      if (!NIC_PATTERN.test(trimmedValue)) {
        return "Enter a valid NIC. Use 12 digits or 9 digits with V/X.";
      }
      return "";
    case "countryCode":
      if (!trimmedValue) return "Country code is required.";
      if (!COUNTRY_CODE_PATTERN.test(trimmedValue)) return "Country code must look like +94.";
      return "";
    case "phone":
      if (!trimmedValue) return "Phone number is required.";
      if (!PHONE_PATTERN.test(trimmedValue)) {
        return "Phone number must contain only digits and be 7 to 15 digits long.";
      }
      return "";
    case "birthday": {
      if (!value) return "Birthday is required.";
      const birthday = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(birthday.getTime())) return "Enter a valid birthday.";
      if (birthday > today) return "Birthday cannot be in the future.";
      return "";
    }
    case "address":
      if (trimmedValue.length > 255) return "Address must be 255 characters or fewer.";
      return "";
    case "country":
      if (!trimmedValue) return "Country is required.";
      if (trimmedValue.length < 2) return "Country must be at least 2 characters.";
      if (trimmedValue.length > 100) return "Country must be 100 characters or fewer.";
      if (!COUNTRY_PATTERN.test(trimmedValue)) {
        return "Country can contain only letters, spaces, periods, apostrophes, and hyphens.";
      }
      return "";
    case "email":
      return "";
    default:
      return "";
  }
}

function validateProfileForm(data: PatientUpdatePayload): FormErrors {
  return {
    title: validateProfileField("title", data.title || "", data),
    firstName: validateProfileField("firstName", data.firstName, data),
    lastName: validateProfileField("lastName", data.lastName, data),
    nic: validateProfileField("nic", data.nic || "", data),
    email: "",
    countryCode: validateProfileField("countryCode", data.countryCode, data),
    phone: validateProfileField("phone", data.phone, data),
    birthday: validateProfileField("birthday", data.birthday, data),
    address: validateProfileField("address", data.address, data),
    country: validateProfileField("country", data.country, data),
  };
}

function getFilledErrors(errors: FormErrors): FormErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([, value]) => Boolean(value))
  ) as FormErrors;
}

function getFieldClass(hasError: boolean, readOnly = false) {
  return `w-full rounded-xl border px-4 py-3 outline-none ${
    readOnly
      ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500"
      : hasError
      ? "border-red-400 focus:border-red-500"
      : "border-slate-300 focus:border-blue-500"
  }`;
}

const PatientProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState<PatientUpdatePayload>({
    title: "",
    firstName: "",
    lastName: "",
    nic: "",
    email: "",
    countryCode: "+94",
    phone: "",
    birthday: "",
    gender: "",
    address: "",
    country: "",
  });
  const [phoneInputValue, setPhoneInputValue] = useState(
    `${formData.countryCode}${formData.phone}`
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const [profileImage, setProfileImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageRemoving, setImageRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const auth = getStoredTelemedicineAuth();
  const token = auth.token || "";

  const loadProfile = async () => {
    try {
      setLoading(true);

      const data = await getCurrentPatientProfile(token);

      const nextForm: PatientUpdatePayload = {
        title: (data.title || "") as PatientUpdatePayload["title"],
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        nic: data.nic || "",
        email: data.email || "",
        countryCode: data.countryCode || "+94",
        phone: data.phone || "",
        birthday: data.birthday
          ? new Date(data.birthday).toISOString().split("T")[0]
          : "",
        address: data.address || "",
        country: data.country || "",
      };

      setFormData(nextForm);
      setPhoneInputValue(`${nextForm.countryCode}${nextForm.phone}`);
      setErrors({});

      const fullName = `${nextForm.firstName} ${nextForm.lastName}`.trim();
      localStorage.setItem(PROFILE_NAME_KEY, fullName);
      localStorage.setItem(PROFILE_IMAGE_KEY, data.profileImage || "");
      setProfileImage(data.profileImage || "");
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
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
        localStorage.removeItem(PROFILE_IMAGE_KEY);
        clearTelemedicineAuth();
        navigate("/login", {
          replace: true,
          state: {
            registeredEmail: auth.email || "",
            infoMessage: "Account not available.",
          },
        });
        return;
      }

      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      navigate("/login", {
        replace: true,
        state: {
          infoMessage: "Please log in.",
        },
      });
      return;
    }

    loadProfile();
  }, [navigate, token]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof PatientUpdatePayload;
    const nextFormData = {
      ...formData,
      [fieldName]: value,
    };

    setFormData(nextFormData);
    setErrors((prev) => ({
      ...prev,
      [fieldName]: validateProfileField(fieldName, value, nextFormData),
    }));
  };

  const handleBlur = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof PatientUpdatePayload;

    setErrors((prev) => ({
      ...prev,
      [fieldName]: validateProfileField(fieldName, value, formData),
    }));
  };

  const handlePhoneChange = (phone: string, countryCode: string) => {
    const normalizedPhone = phone
      .replace(countryCode, "")
      .replace(/\D/g, "");

    const nextFormData = {
      ...formData,
      countryCode,
      phone: normalizedPhone,
    };

    setPhoneInputValue(phone);
    setFormData(nextFormData);
    setErrors((prev) => ({
      ...prev,
      countryCode: validateProfileField("countryCode", countryCode, nextFormData),
      phone: validateProfileField("phone", normalizedPhone, nextFormData),
    }));
  };

  const handlePhoneBlur = () => {
    setErrors((prev) => ({
      ...prev,
      countryCode: validateProfileField("countryCode", formData.countryCode, formData),
      phone: validateProfileField("phone", formData.phone, formData),
    }));
  };

  const handleChooseImage = () => {
    if (imageUploading || imageRemoving) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Choose a valid image.", "error");
      return;
    }

    try {
      setImageUploading(true);
      const response = await uploadCurrentPatientProfileImage(token, file);
      const nextProfileImage = response.profileImage || response.patient.profileImage || "";

      localStorage.setItem(PROFILE_IMAGE_KEY, nextProfileImage);
      setProfileImage(nextProfileImage);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      showToast(response.message || "Photo updated.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload profile picture";
      showToast(message, "error");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    void (async () => {
      try {
        setImageRemoving(true);
        const response = await removeCurrentPatientProfileImage(token);

        localStorage.removeItem(PROFILE_IMAGE_KEY);
        setProfileImage("");
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
        showToast(response.message || "Photo removed.", "info");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to remove profile picture";
        showToast(message, "error");
      } finally {
        setImageRemoving(false);
      }
    })();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = getFilledErrors(validateProfileForm(formData));

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      showToast("Fix the highlighted fields.", "error");
      return;
    }

    try {
      setErrors({});

      const payload: PatientUpdatePayload = {
        ...formData,
        title: formData.title || undefined,
        nic: formData.nic?.trim().toUpperCase() || undefined,
      };

      const response = await updateCurrentPatientProfile(token, payload);

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      localStorage.setItem(PROFILE_NAME_KEY, fullName);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));

      showToast(response.message || "Profile updated.", "success");
      setEditing(false);
      await loadProfile();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";

      if (error instanceof PatientApiError) {
        setErrors(error.fieldErrors);
      }

      showToast(message, "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) {
      showToast("Please log in.", "error");
      return;
    }

    if (!deletePassword.trim()) {
      showToast("Enter your password.", "error");
      return;
    }

    try {
      setDeleting(true);

      await deleteCurrentPatient(token, deletePassword);

      localStorage.removeItem(PROFILE_NAME_KEY);
      localStorage.removeItem(PROFILE_IMAGE_KEY);
      setDeletePassword("");
      setShowDeletePrompt(false);
      clearTelemedicineAuth();

      navigate("/", {
        replace: true,
        state: {
          successMessage: "Account deleted.",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete account";
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const fullName = `${formData.firstName} ${formData.lastName}`.trim();
  const initials =
    `${formData.firstName?.[0] || ""}${formData.lastName?.[0] || ""}`.toUpperCase() || "P";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-lg font-semibold text-slate-700">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      {showDeletePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-red-200 bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold text-red-800">
              Verify Password To Delete Profile
            </h2>
            <p className="mt-3 text-sm text-red-700">
              Enter your current account password. If the password is wrong,
              your profile will not be deleted.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <PasswordField
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                wrapperClassName="flex-1"
                inputClassName="w-full rounded-xl border border-red-200 bg-white px-4 py-3 outline-none focus:border-red-400"
              />

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
              >
                {deleting ? "Verifying..." : "Delete Profile"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDeletePrompt(false);
                  setDeletePassword("");
                }}
                disabled={deleting}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-4">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-blue-200 bg-blue-100/70 px-8 py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-blue-100"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white ring-4 ring-blue-100">
                    {initials}
                  </div>
                )}

                <div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    {fullName || "Patient Profile"}
                  </h1>
                  <p className="mt-2 text-slate-600">
                    Manage your personal details and account
                  </p>
                </div>
              </div>

              {!editing && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-xl border border-blue-200 bg-white px-6 py-3 font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                  >
                    Edit Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDeletePrompt(true);
                    }}
                    disabled={deleting}
                    className="rounded-xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-70"
                  >
                    Delete Account
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
                  disabled={imageUploading || imageRemoving}
                  className="hidden"
                />

                <div className="mt-5 flex w-full flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleChooseImage}
                    disabled={imageUploading || imageRemoving}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {imageUploading
                      ? "Uploading..."
                      : profileImage
                      ? "Change Picture"
                      : "Upload Picture"}
                  </button>

                  {profileImage && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={imageUploading || imageRemoving}
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {imageRemoving ? "Removing..." : "Remove Picture"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              {!editing ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <ProfileItem label="Title" value={formData.title || ""} />
                  <ProfileItem label="First Name" value={formData.firstName} />
                  <ProfileItem label="Last Name" value={formData.lastName} />
                  <ProfileItem label="NIC Number" value={formData.nic || ""} />
                  <ProfileItem label="Email" value={formData.email} />
                  <ProfileItem
                    label="Phone"
                    value={`${formData.countryCode} ${formData.phone}`}
                  />
                  <ProfileItem label="Birthday" value={formData.birthday} />
                  <ProfileItem label="Country" value={formData.country} />
                  <ProfileItem label="Address" value={formData.address} full />
                </div>
              ) : (
                <form onSubmit={handleSave} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Title
                    </label>
                    <select
                      name="title"
                      value={formData.title || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={getFieldClass(Boolean(errors.title))}
                      required
                    >
                      <option value="">Select title</option>
                      <option value="Mr">Mr</option>
                      <option value="Miss">Miss</option>
                      <option value="Mrs">Mrs</option>
                    </select>
                    {errors.title && (
                      <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                    )}
                  </div>

                  <InputField
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.firstName}
                    autoComplete="given-name"
                    maxLength={50}
                  />

                  <InputField
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.lastName}
                    autoComplete="family-name"
                    maxLength={50}
                  />

                  <InputField
                    label="NIC Number"
                    name="nic"
                    value={formData.nic || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.nic}
                    maxLength={12}
                    helperText="Use 12 digits for new NIC or 9 digits with V/X for old NIC."
                  />

                  <InputField
                    label="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    readOnly
                    error={errors.email}
                    helperText="Email is managed by your account and cannot be changed here."
                  />

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Phone
                    </label>
                    <PhoneNumberInput
                      value={phoneInputValue}
                      onChange={handlePhoneChange}
                      onBlur={handlePhoneBlur}
                      error={errors.countryCode || errors.phone}
                      defaultCountry="lk"
                    />
                  </div>

                  <InputField
                    label="Birthday"
                    name="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.birthday}
                  />

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Country
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={getFieldClass(Boolean(errors.country))}
                      required
                    >
                      <option value="">Select country</option>
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    {errors.country && (
                      <p className="mt-2 text-sm text-red-600">{errors.country}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      rows={4}
                      maxLength={255}
                      className={getFieldClass(Boolean(errors.address))}
                    />
                    {errors.address && (
                      <p className="mt-2 text-sm text-red-600">{errors.address}</p>
                    )}
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
                        setErrors({});
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
  onBlur,
  type = "text",
  readOnly = false,
  helperText = "",
  error = "",
  autoComplete,
  maxLength,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  onBlur: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  type?: string;
  readOnly?: boolean;
  helperText?: string;
  error?: string;
  autoComplete?: string;
  maxLength?: number;
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
        onBlur={onBlur}
        readOnly={readOnly}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className={getFieldClass(Boolean(error), readOnly)}
        required={name !== "address"}
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {helperText && (
        <p className="mt-2 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
};

export default PatientProfile;

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../components/common/toastContext";
import PhoneNumberInput from "../../components/common/PhoneNumberInput";
import { useLocationToast } from "../../hooks/useLocationToast";
import { DOCTOR_API_URL, DOCTOR_SPECIALTY_API_URL } from "../../config/api";

type DoctorFormData = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  specialization: string;
  experience: string;
  qualification: string;
  licenseNumber: string;
  consultationFee: string;
  about: string;
  hospitalName: string;
  hospitalAddress: string;
  city: string;
};

type Errors = Partial<Record<keyof DoctorFormData, string>>;

const STEPS = [
  {
    step: 1,
    title: "Account Setup",
    desc: "Create your secure account credentials",
    icon: "👤",
    fields: ["fullName", "email", "password", "confirmPassword", "phone"],
  },
  {
    step: 2,
    title: "Professional Credentials",
    desc: "Verify your medical qualifications and license",
    icon: "📋",
    fields: ["specialization", "experience", "qualification", "licenseNumber", "consultationFee"],
  },
  {
    step: 3,
    title: "Practice Information",
    desc: "Add your hospital and practice location",
    icon: "🏥",
    fields: ["hospitalName", "hospitalAddress", "city"],
  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+[1-9]\d{9,14}$/;

function validateField(key: keyof DoctorFormData, value: string, formData: DoctorFormData): string {
  const trim = value.trim();

  switch (key) {
    case "fullName":
      return trim.length < 2 ? "Full name is required (minimum 2 characters)" : "";

    case "email":
      return !EMAIL_REGEX.test(trim) ? "Valid email address required" : "";

    case "password":
      if (value.length < 8) return "Password must be 8+ characters";
      if (!/[A-Z]/.test(value)) return "Must include 1 uppercase letter";
      if (!/[0-9]/.test(value)) return "Must include 1 number";
      return "";

    case "confirmPassword":
      return value !== formData.password ? "Passwords must match" : "";

    case "phone":
      return !PHONE_REGEX.test(trim.replace(/\s/g, "")) ? "Valid phone number with country code required" : "";

    case "specialization":
      return !trim ? "Medical specialty is required" : "";

    case "experience":
      const exp = Number(trim);
      return exp < 0 || exp > 70 || isNaN(exp) ? "Valid years of experience required (0-70)" : "";

    case "qualification":
      return trim.length < 2 ? "Medical qualification is required" : "";

    case "licenseNumber":
      return trim.length < 2 ? "Medical license number is required" : "";

    case "consultationFee":
      const fee = Number(trim);
      return fee < 500 || fee > 25000 || isNaN(fee) ? "Consultation fee must be ₨500-₨25,000" : "";

    case "hospitalName":
      return trim.length < 2 ? "Hospital/clinic name is required" : "";

    case "hospitalAddress":
      return trim.length < 5 ? "Complete address is required" : "";

    case "city":
      return trim.length < 2 ? "City name is required" : "";

    default:
      return "";
  }
}

export default function DoctorRegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  useLocationToast();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Set<keyof DoctorFormData>>(new Set());
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  
  const [data, setData] = useState<DoctorFormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    specialization: "",
    experience: "",
    qualification: "",
    licenseNumber: "",
    consultationFee: "",
    about: "",
    hospitalName: "",
    hospitalAddress: "",
    city: "",
  });

  // Clear errors AND touched fields when moving between steps
  useEffect(() => {
    setErrors({});
    setTouched(new Set());
  }, [step]);

  // Load specialties
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(DOCTOR_SPECIALTY_API_URL);
        if (res.ok) {
          const items = (await res.json()) as Array<{ name?: string }>;
          setSpecialties(
            items
              .map((i) => i.name?.trim() || "")
              .filter(Boolean)
              .sort()
          );
        }
      } catch (e) {
        console.error("Failed to load specialties");
      }
    })();
  }, []);

  // Photo preview
  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const currentConfig = STEPS[step];
  const fieldList = currentConfig.fields as Array<keyof DoctorFormData>;

  const handleChange_NoValidate = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const key = name as keyof DoctorFormData;
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleBlurField = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const key = name as keyof DoctorFormData;
    setTouched((prev) => new Set([...prev, key]));
    const error = validateField(key, value, data);
    setErrors((prev) => ({ ...prev, [key]: error }));
  };

  const handlePhoneChange = (phone: string) => {
    setData((prev) => ({ ...prev, phone }));
    setTouched((prev) => new Set([...prev, "phone"]));
    const error = validateField("phone", phone, data);
    setErrors((prev) => ({ ...prev, phone: error }));
  };

  const handlePhoneBlur = () => {
    const error = validateField("phone", data.phone, data);
    setErrors((prev) => ({ ...prev, phone: error }));
  };

  const validateStep = (): boolean => {
    let stepErrors: Errors = {};
    fieldList.forEach((field) => {
      const val = String(data[field]);
      const error = validateField(field, val, data);
      if (error) stepErrors[field] = error;
      // Mark all fields as touched
      setTouched((prev) => new Set([...prev, field]));
    });

    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      setErrors({});
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0));
    setErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    const payload = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (k !== "confirmPassword") payload.append(k, v);
    });
    if (photo) payload.append("profileImage", photo);

    try {
      const res = await fetch(DOCTOR_API_URL, { method: "POST", body: payload });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.message || err.error || (err.errors?.[0]?.message) || "Registration failed"
        );
      }

      showToast("Registration successful! Awaiting admin approval.", "success");
      navigate("/login", { replace: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Registration failed";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (fieldKey: keyof DoctorFormData, label: string, type = "text") => {
    const value = data[fieldKey];
    const error = errors[fieldKey];
    const isTouched = touched.has(fieldKey);
    // Only display error if:
    // 1. Field belongs to current step
    // 2. Field was touched
    // 3. Error message exists
    const isCurrentStepField = fieldList.includes(fieldKey);
    const hasError = isCurrentStepField && isTouched && error && error.trim().length > 0;

    return (
      <div key={fieldKey}>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {label} {fieldList.includes(fieldKey) && "*"}
        </label>
        {fieldKey === "phone" ? (
          <PhoneNumberInput
            value={value}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
          />
        ) : fieldKey === "specialization" ? (
          <select
            name={fieldKey}
            value={value}
            onChange={handleChange_NoValidate}
            onBlur={handleBlurField}
            className={`w-full rounded-lg border px-4 py-2.5 text-slate-900 outline-none transition ${
              hasError ? "border-red-400 bg-red-50" : "border-slate-300 bg-white hover:border-slate-400"
            } focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
          >
            <option value="">Select specialty</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : fieldKey === "hospitalAddress" ? (
          <textarea
            name={fieldKey}
            value={value}
            onChange={handleChange_NoValidate}
            onBlur={handleBlurField}
            rows={3}
            placeholder="Street, building, suite..."
            className={`w-full rounded-lg border px-4 py-2.5 text-slate-900 outline-none transition ${
              hasError ? "border-red-400 bg-red-50" : "border-slate-300 bg-white hover:border-slate-400"
            } focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
          />
        ) : fieldKey === "about" ? (
          <textarea
            name={fieldKey}
            value={value}
            onChange={handleChange_NoValidate}
            rows={4}
            placeholder="Optional: Professional bio and expertise..."
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        ) : fieldKey === "consultationFee" ? (
          <div className="relative">
            <span className="absolute left-4 top-2.5 text-slate-600">₨</span>
            <input
              type="number"
              name={fieldKey}
              value={value}
              onChange={handleChange_NoValidate}
              onBlur={handleBlurField}
              placeholder="2500"
              min="500"
              max="25000"
              className={`w-full rounded-lg border px-4 py-2.5 pl-8 text-slate-900 outline-none transition ${
                hasError ? "border-red-400 bg-red-50" : "border-slate-300 bg-white hover:border-slate-400"
              } focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
            />
          </div>
        ) : (
          <input
            type={type}
            name={fieldKey}
            value={value}
            onChange={handleChange_NoValidate}
            onBlur={handleBlurField}
            placeholder={
              fieldKey === "fullName"
                ? "Dr. John Smith"
                : fieldKey === "email"
                ? "doctor@healthcare.com"
                : fieldKey === "password"
                ? "Min 8 chars, 1 uppercase, 1 number"
                : fieldKey === "experience"
                ? "5"
                : fieldKey === "qualification"
                ? "MBBS, MD"
                : fieldKey === "licenseNumber"
                ? "SLMC-00715"
                : fieldKey === "hospitalName"
                ? "City Medical Center"
                : fieldKey === "city"
                ? "New York"
                : ""
            }
            className={`w-full rounded-lg border px-4 py-2.5 text-slate-900 outline-none transition ${
              hasError ? "border-red-400 bg-red-50" : "border-slate-300 bg-white hover:border-slate-400"
            } focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
          />
        )}
        {hasError && <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-block rounded-full bg-white px-5 py-2 shadow-sm mb-4">
            <span className="text-2xl mr-2">🏥</span>
            <span className="text-sm font-semibold text-slate-700">Smart Healthcare</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900">Doctor Registration</h1>
          <p className="mt-2 text-slate-600">Complete your profile to join our platform</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 flex justify-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.step} className="flex items-center">
              <div
                className={`h-12 w-12 rounded-full font-bold flex items-center justify-center transition ${
                  i === step
                    ? "bg-blue-600 text-white scale-110 shadow-lg"
                    : i < step
                    ? "bg-green-600 text-white"
                    : "bg-slate-300 text-slate-600"
                }`}
              >
                {i < step ? "✓" : s.icon}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-1.5 w-12 mx-1 rounded ${i < step ? "bg-green-600" : "bg-slate-300"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
          {/* Step Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
              Step {step + 1} / {STEPS.length}
            </p>
            <h2 className="mt-2 text-3xl font-bold">{currentConfig.title}</h2>
            <p className="mt-1 text-blue-100">{currentConfig.desc}</p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-8">
            {/* Step 1 */}
            {step === 0 && (
              <div className="space-y-6">
                {renderField("fullName", "Full Name")}
                {renderField("email", "Email Address", "email")}
                <div className="grid gap-6 md:grid-cols-2">
                  {renderField("password", "Password", "password")}
                  {renderField("confirmPassword", "Confirm Password", "password")}
                </div>
                {renderField("phone", "Phone Number")}
              </div>
            )}

            {/* Step 2 */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {renderField("specialization", "Medical Specialty")}
                  {renderField("experience", "Years of Experience", "number")}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {renderField("qualification", "Medical Qualification")}
                  {renderField("licenseNumber", "License Number")}
                </div>
                {renderField("consultationFee", "Consultation Fee (LKR)")}

                {/* Photo Upload */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Profile Photo (Optional)
                  </label>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="h-24 w-24 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-3xl">
                          📷
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-semibold hover:file:bg-blue-700"
                      />
                      <p className="mt-2 text-xs text-slate-500">JPG, PNG, GIF (max 5MB)</p>
                    </div>
                  </div>
                </div>

                {renderField("about", "Professional Summary")}
              </div>
            )}

            {/* Step 3 */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {renderField("hospitalName", "Hospital/Clinic Name")}
                  {renderField("city", "City")}
                </div>
                {renderField("hospitalAddress", "Full Address")}

                {/* Info Box */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
                  <h3 className="mb-4 font-semibold text-blue-900 flex items-center gap-2">
                    <span>ℹ️</span> What Happens Next?
                  </h3>
                  <div className="grid gap-3 md:grid-cols-3 text-sm text-blue-800">
                    <div className="flex gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        1
                      </span>
                      <span>Admin reviews your credentials</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        2
                      </span>
                      <span>Approval via email within 24 hours</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        3
                      </span>
                      <span>Configure availability in profile</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="mt-8 flex gap-4 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 0}
                className={`px-6 py-2.5 rounded-lg font-semibold transition ${
                  step === 0
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                ← Back
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="ml-auto px-8 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-auto px-8 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60 transition"
                >
                  {loading ? "Submitting..." : "✓ Register"}
                </button>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-8 py-4 text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

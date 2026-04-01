import { useEffect, useState } from "react";
import type { Patient, PatientUpdatePayload } from "../../types/patient";

type PatientFormModalProps = {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onSave: (payload: PatientUpdatePayload) => Promise<void>;
};

const initialForm: PatientUpdatePayload = {
  firstName: "",
  lastName: "",
  email: "",
  countryCode: "",
  phone: "",
  birthday: "",
  gender: "",
  address: "",
  country: "",
};

export default function PatientFormModal({
  open,
  patient,
  onClose,
  onSave,
}: PatientFormModalProps) {
  const [formData, setFormData] = useState<PatientUpdatePayload>(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patient) {
      setFormData({
        firstName: patient.firstName || "",
        lastName: patient.lastName || "",
        email: patient.email || "",
        countryCode: patient.countryCode || "",
        phone: patient.phone || "",
        birthday: patient.birthday ? patient.birthday.slice(0, 10) : "",
        gender: patient.gender || "",
        address: patient.address || "",
        country: patient.country || "",
      });
    } else {
      setFormData(initialForm);
    }
  }, [patient]);

  if (!open || !patient) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Edit Patient</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              First Name
            </label>
            <input
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Last Name
            </label>
            <input
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              readOnly
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-slate-500 outline-none"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Email changes are managed through the auth service.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Code
              </label>
              <input
                name="countryCode"
                value={formData.countryCode}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
                placeholder="+94"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Birthday
            </label>
            <input
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Country
            </label>
            <input
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2 font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

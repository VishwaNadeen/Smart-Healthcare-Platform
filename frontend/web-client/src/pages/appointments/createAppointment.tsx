import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createAppointment,
  type CreateAppointmentPayload,
} from "../../services/appointmentApi";
import {
  getDoctors,
  getDoctorSpecialties,
  type DoctorProfileResponse,
  type DoctorSpecialty,
} from "../../services/doctorApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

type AppointmentFormState = {
  specialization: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  paymentStatus: "paid" | "pending" | "failed";
};

const initialFormState: AppointmentFormState = {
  specialization: "",
  doctorId: "",
  doctorName: "",
  appointmentDate: "",
  appointmentTime: "",
  reason: "",
  paymentStatus: "pending",
};

function getTodayDateValue() {
  return new Date().toISOString().split("T")[0] || "";
}

function getDoctorLabel(doctor: DoctorProfileResponse) {
  const hospital = doctor.hospitalName?.trim();
  return hospital
    ? `${doctor.fullName} - ${hospital}`
    : doctor.fullName;
}

export default function CreateAppointmentPage() {
  const navigate = useNavigate();
  const auth = getStoredTelemedicineAuth();

  const [formData, setFormData] = useState<AppointmentFormState>(initialFormState);
  const [specialties, setSpecialties] = useState<DoctorSpecialty[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfileResponse[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadSpecialties() {
      try {
        setLoadingSpecialties(true);
        setErrorMessage("");

        const data = await getDoctorSpecialties();
        const activeSpecialties = (Array.isArray(data) ? data : []).filter(
          (specialty) => specialty.isActive !== false
        );

        setSpecialties(activeSpecialties);
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load specializations."
        );
      } finally {
        setLoadingSpecialties(false);
      }
    }

    loadSpecialties();
  }, []);

  useEffect(() => {
    async function loadDoctorsForSpecialization() {
      if (!formData.specialization) {
        setDoctors([]);
        return;
      }

      try {
        setLoadingDoctors(true);
        setErrorMessage("");

        const data = await getDoctors({
          specialization: formData.specialization,
          acceptsNewAppointments: true,
        });

        setDoctors(Array.isArray(data) ? data : []);
      } catch (error: unknown) {
        setDoctors([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load doctors."
        );
      } finally {
        setLoadingDoctors(false);
      }
    }

    loadDoctorsForSpecialization();
  }, [formData.specialization]);

  function updateField<K extends keyof AppointmentFormState>(
    key: K,
    value: AppointmentFormState[K]
  ) {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSpecializationChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextSpecialization = event.target.value;

    setSuccessMessage("");
    setFormData((current) => ({
      ...current,
      specialization: nextSpecialization,
      doctorId: "",
      doctorName: "",
    }));
  }

  function handleDoctorChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextDoctorId = event.target.value;
    const doctor = doctors.find((item) => item._id === nextDoctorId) || null;

    setSuccessMessage("");
    setFormData((current) => ({
      ...current,
      doctorId: nextDoctorId,
      doctorName: doctor?.fullName || "",
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.token) {
      setErrorMessage("Please sign in as a patient to create an appointment.");
      return;
    }

    if (!formData.specialization || !formData.doctorId || !formData.doctorName) {
      setErrorMessage("Select a specialization and doctor before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload: CreateAppointmentPayload = {
        doctorId: formData.doctorId,
        doctorName: formData.doctorName,
        specialization: formData.specialization,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        reason: formData.reason,
        paymentStatus: formData.paymentStatus,
      };

      const response = await createAppointment(auth.token, payload);

      setSuccessMessage(
        response.message || "Appointment request created successfully."
      );
      setFormData(initialFormState);
      setDoctors([]);

      window.setTimeout(() => {
        navigate("/appointments/patient");
      }, 1200);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create appointment."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#f8fbff_26%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                Create Appointment
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Choose a specialization first, then select a doctor from the
                doctor service. Appointment booking still submits only to the
                appointment service.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Specialization
                  </label>
                  <select
                    value={formData.specialization}
                    onChange={handleSpecializationChange}
                    disabled={loadingSpecialties}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                    required
                  >
                    <option value="">
                      {loadingSpecialties
                        ? "Loading specializations..."
                        : "Select specialization"}
                    </option>
                    {specialties.map((specialty) => (
                      <option key={specialty._id} value={specialty.name}>
                        {specialty.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Doctor
                  </label>
                  <select
                    value={formData.doctorId}
                    onChange={handleDoctorChange}
                    disabled={!formData.specialization || loadingDoctors}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                    required
                  >
                    <option value="">
                      {!formData.specialization
                        ? "Select specialization first"
                        : loadingDoctors
                          ? "Loading doctors..."
                          : doctors.length === 0
                            ? "No doctors found"
                            : "Select doctor"}
                    </option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {getDoctorLabel(doctor)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    value={formData.appointmentDate}
                    min={getTodayDateValue()}
                    onChange={(event) =>
                      updateField("appointmentDate", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Appointment Time
                  </label>
                  <input
                    type="time"
                    value={formData.appointmentTime}
                    onChange={(event) =>
                      updateField("appointmentTime", event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason for Appointment
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(event) => updateField("reason", event.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                  placeholder="Describe your health concern"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Status
                </label>
                <select
                  value={formData.paymentStatus}
                  onChange={(event) =>
                    updateField(
                      "paymentStatus",
                      event.target.value as AppointmentFormState["paymentStatus"]
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    loadingSpecialties ||
                    loadingDoctors ||
                    !formData.specialization ||
                    !formData.doctorId
                  }
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Creating Appointment..." : "Create Appointment"}
                </button>

                <Link
                  to="/appointments/patient"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to My Appointments
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

import type { Patient } from "../../types/patient";
import PatientStatusBadge from "./PatientStatusBadge";

function maskEmail(email: string) {
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

type PatientTableProps = {
  patients: Patient[];
  loading: boolean;
  onView: (patient: Patient) => void;
  onEdit: (patient: Patient) => void;
  onToggleStatus: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
};

export default function PatientTable({
  patients,
  loading,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: PatientTableProps) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-slate-600">Loading patients...</p>
      </div>
    );
  }

  if (!patients.length) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-slate-600">No patients found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50">
            <tr className="text-sm text-slate-600">
              <th className="px-5 py-4 font-semibold">Name</th>
              <th className="px-5 py-4 font-semibold">Email</th>
              <th className="px-5 py-4 font-semibold">Phone</th>
              <th className="px-5 py-4 font-semibold">Country</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Created</th>
              <th className="px-5 py-4 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {patients.map((patient) => (
              <tr key={patient._id} className="border-t border-slate-100">
                <td className="px-5 py-4 text-sm text-slate-800">
                  {patient.firstName} {patient.lastName}
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {maskEmail(patient.email)}
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {maskPhone(patient.countryCode, patient.phone)}
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {patient.country || "-"}
                </td>
                <td className="px-5 py-4 text-sm">
                  <PatientStatusBadge status={patient.status || "active"} />
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {patient.createdAt
                    ? new Date(patient.createdAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onView(patient)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEdit(patient)}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onToggleStatus(patient)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white ${
                        patient.status === "inactive"
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      {patient.status === "inactive" ? "Activate" : "Deactivate"}
                    </button>
                    <button
                      onClick={() => onDelete(patient)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

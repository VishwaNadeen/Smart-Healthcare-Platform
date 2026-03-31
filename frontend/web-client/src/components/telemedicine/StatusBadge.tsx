import type { TelemedicineStatus } from "../../services/telemedicineApi";

type StatusBadgeProps = {
  status: TelemedicineStatus;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusClasses: Record<TelemedicineStatus, string> = {
    scheduled: "bg-amber-100 text-amber-700 border border-amber-200",
    active: "bg-green-100 text-green-700 border border-green-200",
    completed: "bg-blue-100 text-blue-700 border border-blue-200",
    cancelled: "bg-red-100 text-red-700 border border-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
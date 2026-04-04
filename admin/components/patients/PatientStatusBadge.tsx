type PatientStatusBadgeProps = {
  status?: "active" | "inactive";
};

export default function PatientStatusBadge({
  status = "active",
}: PatientStatusBadgeProps) {
  const isActive = status === "active";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        isActive
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
import { Link } from "react-router-dom";

const adminSections = [
  {
    title: "User Management",
    description:
      "Manage patient and doctor accounts, review records, and keep platform access organized.",
    to: "/users",
    action: "Open Users",
  },
  {
    title: "Doctor Verifications",
    description:
      "Review new doctor registrations and complete verification-related admin tasks.",
    to: "/doctor-verifications",
    action: "Review Verifications",
  },
  {
    title: "Appointments",
    description:
      "Monitor bookings, scheduling activity, and appointment-related operations across the platform.",
    to: "/appointments",
    action: "View Appointments",
  },
  {
    title: "Payments",
    description:
      "Track consultation payments and keep an eye on transaction-related platform workflows.",
    to: "/payments",
    action: "Open Payments",
  },
  {
    title: "Platform Operations",
    description:
      "Use this area to supervise broader operational tasks and overall admin-level coordination.",
    to: "/operations",
    action: "Open Operations",
  },
] as const;

export default function AdminDashboard() {
  return (
    <div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-bold text-slate-800">Admin Dashboard</h2>
        <p className="mt-2 text-slate-600">
          Use this page as the main admin entry point for account control,
          doctor verification, appointments, payments, and platform operations.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {adminSections.map((section) => (
          <div
            key={section.to}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-800">
              {section.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {section.description}
            </p>
            <Link
              to={section.to}
              className="mt-4 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
            >
              {section.action}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-800">
          Suitable Main Dashboard Content
        </h3>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
          <p>
            A good admin dashboard should focus on pending work and high-level
            control, not just raw numbers.
          </p>
          <p>
            Suitable sections here would be pending doctor approvals, recent
            appointment issues, payment alerts, system notices, and quick links
            to the most important admin actions.
          </p>
        </div>
      </div>
    </div>
  );
}

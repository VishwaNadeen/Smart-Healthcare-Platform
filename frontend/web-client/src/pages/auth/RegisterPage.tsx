import { Link } from "react-router-dom";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-3xl font-bold text-slate-800">Register</h1>
        <p className="mt-3 text-slate-500">
          Registration UI is not connected here yet. Use the patient registration flow when it is wired.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}

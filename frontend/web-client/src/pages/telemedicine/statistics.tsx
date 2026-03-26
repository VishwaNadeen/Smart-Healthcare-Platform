export default function Statistics() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">
          Telemedicine Statistics
        </h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-600">
              Total Doctors
            </h2>
            <p className="mt-3 text-3xl font-bold text-blue-600">12</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-600">
              Total Patients
            </h2>
            <p className="mt-3 text-3xl font-bold text-emerald-600">58</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-600">
              Today Sessions
            </h2>
            <p className="mt-3 text-3xl font-bold text-orange-600">7</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-600">
              Cancelled Sessions
            </h2>
            <p className="mt-3 text-3xl font-bold text-red-600">2</p>
          </div>
        </div>
      </div>
    </div>
  );
}
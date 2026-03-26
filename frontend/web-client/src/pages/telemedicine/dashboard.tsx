export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">
          Telemedicine Dashboard
        </h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-700">
              Total Sessions
            </h2>
            <p className="mt-3 text-3xl font-bold text-blue-600">24</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-700">
              Active Sessions
            </h2>
            <p className="mt-3 text-3xl font-bold text-emerald-600">3</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-700">
              Completed Sessions
            </h2>
            <p className="mt-3 text-3xl font-bold text-purple-600">18</p>
          </div>
        </div>
      </div>
    </div>
  );
}
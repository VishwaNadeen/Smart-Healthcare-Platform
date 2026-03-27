import { Link } from "react-router-dom";

type TelemedicineAccessNoticeProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
};

export default function TelemedicineAccessNotice({
  title,
  description,
  actionLabel,
  actionTo = "/login",
}: TelemedicineAccessNoticeProps) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>

        {actionLabel ? (
          <div className="mt-6">
            <Link
              to={actionTo}
              className="inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              {actionLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

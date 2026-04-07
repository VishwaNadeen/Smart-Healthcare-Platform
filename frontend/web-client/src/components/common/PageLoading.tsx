type Props = {
  message?: string;
};

export default function PageLoading({
  message = "Loading...",
}: Props) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
          aria-label="Page loading indicator"
        />
        <p className="mt-4 text-sm text-slate-600">{message}</p>
      </div>
    </section>
  );
}

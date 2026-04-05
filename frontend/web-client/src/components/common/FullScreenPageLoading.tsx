type Props = {
  message?: string;
};

export default function FullScreenPageLoading({
  message = "Loading...",
}: Props) {
  return (
    <section className="flex h-[100dvh] w-full items-center justify-center overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
          aria-label="Fullscreen page loading indicator"
        />
        <p className="mt-3 text-sm text-slate-700">{message}</p>
      </div>
    </section>
  );
}

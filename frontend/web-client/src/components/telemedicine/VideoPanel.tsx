type VideoPanelProps = {
  title: string;
  subtitle?: string;
  small?: boolean;
};

export default function VideoPanel({
  title,
  subtitle,
  small = false,
}: VideoPanelProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm ${
        small ? "h-40" : "h-72 sm:h-96"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />

      <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xl font-bold">
          {title.charAt(0)}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
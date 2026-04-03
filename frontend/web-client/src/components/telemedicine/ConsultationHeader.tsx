type ConsultationHeaderProps = {
  identityLabel: string;
  identityDisplayName: string;
  roomName: string;
  meetingTimer: string;
};

export default function ConsultationHeader({
  identityLabel,
  identityDisplayName,
  roomName,
  meetingTimer,
}: ConsultationHeaderProps) {
  return (
    <div className="grid items-start gap-4 border-b px-4 py-4 md:grid-cols-[1fr_auto_1fr] md:px-6">
      <div>
        <p className="text-sm font-medium text-slate-500">{identityLabel}</p>
        <p className="mt-1 text-base font-semibold text-slate-900 md:text-lg">
          {identityDisplayName}
        </p>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-800 md:text-2xl">
          Online Consultation
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Room Name: {roomName || "Not available"}
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm text-slate-500">Meeting Timer</p>
        <p className="text-lg font-bold text-blue-600">{meetingTimer}</p>
      </div>
    </div>
  );
}

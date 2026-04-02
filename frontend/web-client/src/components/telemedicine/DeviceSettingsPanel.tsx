import type { RefObject } from "react";

type DeviceSettingsPanelProps = {
  panelRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  error: string;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  videoInputDevices: MediaDeviceInfo[];
  selectedAudioInputId: string;
  selectedAudioOutputId: string;
  selectedVideoInputId: string;
  onSelectAudioInput: (device: MediaDeviceInfo) => void;
  onSelectAudioOutput: (device: MediaDeviceInfo) => void;
  onSelectVideoInput: (device: MediaDeviceInfo) => void;
};

export default function DeviceSettingsPanel({
  panelRef,
  loading,
  error,
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectedVideoInputId,
  onSelectAudioInput,
  onSelectAudioOutput,
  onSelectVideoInput,
}: DeviceSettingsPanelProps) {
  return (
    <div
      ref={panelRef}
      className="absolute bottom-full right-0 z-20 mb-3 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-[#111111] text-white shadow-[0_18px_40px_rgba(15,23,42,0.26)]"
    >
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">Devices</p>
        <p className="mt-1 text-xs text-slate-400">
          Select microphone and camera for this consultation.
        </p>
      </div>

      {loading ? (
        <div className="px-4 py-5 text-sm text-slate-300">Loading devices...</div>
      ) : (
        <div className="max-h-[26rem] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Microphones</p>
            <div className="mt-3 space-y-1">
              {audioInputDevices.length > 0 ? (
                audioInputDevices.map((device, index) => {
                  const deviceName = device.label || `Microphone ${index + 1}`;
                  const isSelected = selectedAudioInputId === device.deviceId;

                  return (
                    <button
                      key={device.deviceId || `${deviceName}-${index}`}
                      type="button"
                      onClick={() => onSelectAudioInput(device)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="min-w-0 truncate">{deviceName}</span>
                      {isSelected ? (
                        <span className="ml-3 inline-flex items-center text-emerald-400 before:text-sm before:leading-none before:content-['\\2713']" />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400">No microphones found.</p>
              )}
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Speakers</p>
            <div className="mt-3 space-y-1">
              {audioOutputDevices.length > 0 ? (
                audioOutputDevices.map((device, index) => {
                  const deviceName = device.label || `Speaker ${index + 1}`;
                  const isSelected = selectedAudioOutputId === device.deviceId;

                  return (
                    <button
                      key={device.deviceId || `${deviceName}-${index}`}
                      type="button"
                      onClick={() => onSelectAudioOutput(device)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="min-w-0 truncate">{deviceName}</span>
                      {isSelected ? (
                        <span className="ml-3 inline-flex items-center text-emerald-400 before:text-sm before:leading-none before:content-['\\2713']" />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400">No speakers found.</p>
              )}
            </div>
          </div>

          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-white">Cameras</p>
            <div className="mt-3 space-y-1">
              {videoInputDevices.length > 0 ? (
                videoInputDevices.map((device, index) => {
                  const deviceName = device.label || `Camera ${index + 1}`;
                  const isSelected = selectedVideoInputId === device.deviceId;

                  return (
                    <button
                      key={device.deviceId || `${deviceName}-${index}`}
                      type="button"
                      onClick={() => onSelectVideoInput(device)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="min-w-0 truncate">{deviceName}</span>
                      {isSelected ? (
                        <span className="ml-3 inline-flex items-center text-emerald-400 before:text-sm before:leading-none before:content-['\\2713']" />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400">No cameras found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="border-t border-white/10 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}

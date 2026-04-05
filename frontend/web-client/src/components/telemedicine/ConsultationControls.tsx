import type { RefObject } from "react";
import { Link } from "react-router-dom";
import {
  CameraIcon,
  HangupIcon,
  InviteIcon,
  MicIcon,
  ParticipantsIcon,
  SettingsIcon,
} from "./MeetingControlIcons";
import type { TelemedicineSession } from "../../services/telemedicineApi";
import DeviceSettingsPanel from "./DeviceSettingsPanel";

type ConsultationControlsProps = {
  isDoctor: boolean;
  session: TelemedicineSession;
  canOpenMeetingLink: boolean;
  meetingOpen: boolean;
  showMeetingControls: boolean;
  audioMuted: boolean;
  videoMuted: boolean;
  participantsPaneOpen: boolean;
  isDevicePanelOpen: boolean;
  devicePanelRef: RefObject<HTMLDivElement | null>;
  devicePanelLoading: boolean;
  devicePanelError: string;
  inviteMessage: string;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  videoInputDevices: MediaDeviceInfo[];
  selectedAudioInputId: string;
  selectedAudioOutputId: string;
  selectedVideoInputId: string;
  onStartCall: () => void;
  onJoinMeeting: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleParticipants: () => void;
  onInvitePeople: () => void;
  onMeetingSettings: () => void;
  onHangupMeeting: () => void;
  onSelectAudioInput: (device: MediaDeviceInfo) => void;
  onSelectAudioOutput: (device: MediaDeviceInfo) => void;
  onSelectVideoInput: (device: MediaDeviceInfo) => void;
};

export default function ConsultationControls({
  isDoctor,
  session,
  canOpenMeetingLink,
  meetingOpen,
  showMeetingControls,
  audioMuted,
  videoMuted,
  participantsPaneOpen,
  isDevicePanelOpen,
  devicePanelRef,
  devicePanelLoading,
  devicePanelError,
  inviteMessage,
  audioInputDevices,
  audioOutputDevices,
  videoInputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectedVideoInputId,
  onStartCall,
  onJoinMeeting,
  onToggleAudio,
  onToggleVideo,
  onToggleParticipants,
  onInvitePeople,
  onMeetingSettings,
  onHangupMeeting,
  onSelectAudioInput,
  onSelectAudioOutput,
  onSelectVideoInput,
}: ConsultationControlsProps) {
  const summaryRoute = isDoctor
    ? `/doctor-session-summary/${session.appointmentId}`
    : `/session-summary/${session.appointmentId}`;

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-3 p-4 md:p-6">
      {isDoctor && session.status === "scheduled" ? (
        <button
          onClick={onStartCall}
          className="inline-flex min-h-11 min-w-[10.5rem] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-center font-medium text-white hover:bg-emerald-700"
        >
          Start Session
        </button>
      ) : null}

      {canOpenMeetingLink ? (
        meetingOpen ? null : (
          <button
            onClick={onJoinMeeting}
            className="inline-flex min-h-11 min-w-[10.5rem] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
          >
            Join Meeting
          </button>
        )
      ) : (
        <button
          disabled
          className="inline-flex min-h-11 min-w-[10.5rem] items-center justify-center rounded-lg bg-slate-300 px-4 py-2 text-center font-medium text-slate-600"
        >
          Waiting for doctor to start
        </button>
      )}

      {showMeetingControls ? (
        <div className="relative flex w-full flex-wrap items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={onToggleAudio}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition ${
              audioMuted
                ? "border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:text-blue-700"
                : "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:text-rose-700"
            }`}
            aria-label={audioMuted ? "Unmute microphone" : "Mute microphone"}
            title={audioMuted ? "Unmute microphone" : "Mute microphone"}
          >
            <MicIcon />
          </button>

          <button
            type="button"
            onClick={onToggleVideo}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition ${
              videoMuted
                ? "border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:text-blue-700"
                : "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:text-rose-700"
            }`}
            aria-label={videoMuted ? "Turn camera on" : "Turn camera off"}
            title={videoMuted ? "Turn camera on" : "Turn camera off"}
          >
            <CameraIcon />
          </button>

          <button
            type="button"
            onClick={onToggleParticipants}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
            aria-label={
              participantsPaneOpen ? "Hide participants" : "Show participants"
            }
            title={
              participantsPaneOpen ? "Hide participants" : "Show participants"
            }
          >
            <ParticipantsIcon />
          </button>

          <button
            type="button"
            onClick={onInvitePeople}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
            aria-label="Invite people"
            title="Invite people"
          >
            <InviteIcon />
          </button>

          <button
            type="button"
            onClick={onMeetingSettings}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
            aria-label="Microphone and camera devices"
            title="Microphone and camera devices"
          >
            <SettingsIcon />
          </button>

          <button
            type="button"
            onClick={onHangupMeeting}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-rose-600 text-white transition hover:bg-rose-700"
            aria-label="Hang up meeting"
            title="Hang up meeting"
          >
            <HangupIcon />
          </button>

          {isDevicePanelOpen ? (
            <DeviceSettingsPanel
              panelRef={devicePanelRef}
              loading={devicePanelLoading}
              error={devicePanelError}
              audioInputDevices={audioInputDevices}
              audioOutputDevices={audioOutputDevices}
              videoInputDevices={videoInputDevices}
              selectedAudioInputId={selectedAudioInputId}
              selectedAudioOutputId={selectedAudioOutputId}
              selectedVideoInputId={selectedVideoInputId}
              onSelectAudioInput={onSelectAudioInput}
              onSelectAudioOutput={onSelectAudioOutput}
              onSelectVideoInput={onSelectVideoInput}
            />
          ) : null}
        </div>
      ) : null}

      {inviteMessage ? (
        <p className="self-center text-sm font-medium text-emerald-600">
          {inviteMessage}
        </p>
      ) : null}

      {session.status === "completed" ? (
        <Link
          to={summaryRoute}
          className="inline-flex min-h-11 min-w-[10.5rem] items-center justify-center rounded-lg bg-slate-700 px-4 py-2 text-center font-medium text-white hover:bg-slate-800"
        >
          View Summary
        </Link>
      ) : null}
    </div>
  );
}

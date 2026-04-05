import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PrescriptionForm, {
  type PrescriptionFormHandle,
} from "../../components/telemedicine/PrescriptionForm";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import ChatPanel from "../../components/telemedicine/ChatPanel";
import ConsultationControls from "../../components/telemedicine/ConsultationControls";
import ConsultationHeader from "../../components/telemedicine/ConsultationHeader";
import TelemedicineReportsPanel from "../../components/telemedicine/TelemedicineReportsPanel";
import ConsultationVideoSection from "../../components/telemedicine/ConsultationVideoSection";
import HangupConfirmModal from "../../components/telemedicine/HangupConfirmModal";
import {
  updateConsultationNotes,
  updateSessionStatus,
} from "../../services/telemedicineApi";
import type { TelemedicineSession } from "../../services/telemedicineApi";
import { consultationChatDock } from "../../hooks/telemedicine/consultationChatDock";
import { consultationMeeting } from "../../hooks/telemedicine/consultationMeeting";
import { consultationSession } from "../../hooks/telemedicine/consultationSession";
import { telemedicinePresence } from "../../hooks/telemedicine/telemedicinePresence";
import {
  canAccessTelemedicineSession,
  getStoredTelemedicineAuth,
} from "../../utils/telemedicineAuth";
import { formatConsultationTime } from "../../utils/consultationUtils";

export default function Consultation() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const auth = getStoredTelemedicineAuth();
  const role = auth.actorRole;
  const isDoctor = role === "doctor";

  const [, setSavingNotes] = useState(false);
  const [isHangupConfirmOpen, setIsHangupConfirmOpen] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const prescriptionFormRef = useRef<PrescriptionFormHandle | null>(null);
  const {
    session,
    setSession,
    notes,
    setNotes,
    loading,
    patientAge,
    seconds,
  } = consultationSession({
    appointmentId,
    authToken: auth.token,
  });
  const canPatientJoin = session?.status === "active";
  const canOpenMeetingLink = Boolean(isDoctor || canPatientJoin);
  const bothParticipantsConnected = telemedicinePresence({
    appointmentId,
    userId: auth.userId,
    role,
    sessionId: session?._id,
  });
  const {
    isChatOpen,
    setIsChatOpen,
    unreadChatCount,
    chatPanelRef,
  } = consultationChatDock({
    appointmentId,
    role,
  });

  async function handleStartCall() {
    if (!appointmentId || !session || !isDoctor) return;

    try {
      const updated = await updateSessionStatus(appointmentId, "active");
      setSession(updated.session);
    } catch (error) {
      console.error("Failed to start session:", error);
      alert("Failed to start session");
    }
  }

  async function handleJoinMeeting() {
    if (!appointmentId || !session || !canOpenMeetingLink) {
      return;
    }

    try {
      resetMeetingError();

      if (isDoctor && session.status === "scheduled") {
        const updated = await updateSessionStatus(appointmentId, "active");
        setSession(updated.session);
      }

      openMeeting();
    } catch (error) {
      console.error("Failed to join meeting:", error);
      alert("Failed to join meeting");
    }
  }

  async function handleSaveNotes() {
    if (!appointmentId || !session || !isDoctor) return;

    try {
      setSavingNotes(true);

      const updated = await updateConsultationNotes({
        appointmentId,
        notes,
      });

      setSession(updated.data);
      setNotes(updated.data.notes || "");
    } catch (error) {
      console.error("Failed to save notes:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to save consultation notes");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleEndCall() {
    if (!appointmentId || !session || !isDoctor || isEndingSession) return;

    if (!meetingOpen || !meetingReady) {
      alert("Meeting is not ready to end yet");
      return;
    }

    try {
      setIsEndingSession(true);

      if (prescriptionFormRef.current) {
        await prescriptionFormRef.current.saveAll();
      } else {
        const updatedNotes = await updateConsultationNotes({
          appointmentId,
          notes,
        });
        setSession(updatedNotes.data);
        setNotes(updatedNotes.data.notes || "");
      }

      const updated = await updateSessionStatus(appointmentId, "completed");
      setSession(updated.session);

      const didHangup = proceedHangupMeeting({
        skipDoctorEndCall: true,
        suppressOpenAlert: true,
      });

      if (!didHangup) {
        throw new Error("Meeting could not be ended");
      }

      navigate(`/doctor-session-summary/${updated.session.appointmentId}`);
    } catch (error) {
      console.error("Failed to end call:", error);
      if (
        error instanceof Error &&
        error.message === "Please fill all prescription fields"
      ) {
        return;
      }

      alert(
        error instanceof Error && error.message
          ? error.message
          : "Cannot end session because saving failed"
      );
    } finally {
      setIsEndingSession(false);
    }
  }
  const {
    meetingOpen,
    meetingReady,
    meetingLoading,
    meetingError,
    audioMuted,
    videoMuted,
    participantsPaneOpen,
    isDevicePanelOpen,
    devicePanelLoading,
    devicePanelError,
    inviteMessage,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    meetingContainerRef,
    devicePanelRef,
    resetMeetingError,
    openMeeting,
    handleToggleAudio,
    handleToggleVideo,
    handleToggleParticipants,
    handleInvitePeople,
    handleMeetingSettings,
    handleSelectAudioInput,
    handleSelectAudioOutput,
    handleSelectVideoInput,
    proceedHangupMeeting,
  } = consultationMeeting({
    session,
    isDoctor,
    canOpenMeetingLink,
    username: auth.username,
    email: auth.email,
    onDoctorEndCall: () => {
      void handleEndCall();
    },
  });

  function handleHangupMeeting() {
    if (isDoctor) {
      setIsHangupConfirmOpen(true);
      return;
    }

    proceedHangupMeeting();
    if (session?.appointmentId) {
      navigate(`/session-summary/${session.appointmentId}`);
    }
  }

  if (!auth.userId || !role) {
    return (
      <TelemedicineAccessNotice
        title="Consultation access needs login data"
        description="This page needs a valid login session with role and user id. Please sign in again."
        actionLabel="Go to Login"
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-lg font-medium text-slate-700">
          Loading consultation...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-lg font-medium text-red-600">Session not found</p>
      </div>
    );
  }

  if (!canAccessTelemedicineSession(auth, session)) {
    return (
      <TelemedicineAccessNotice
        title="Consultation access denied"
        description="This appointment belongs to a different doctor or patient account."
        actionLabel={isDoctor ? "Doctor Sessions" : "Patient Sessions"}
        actionTo={isDoctor ? "/doctor-sessions" : "/patient-sessions"}
      />
    );
  }
  const patientName =
    session.patient?.fullName ||
    (session as TelemedicineSession & { patientName?: string }).patientName ||
    "Patient";
  const patientDisplayName =
    patientAge !== null ? `${patientName} - ${patientAge}Y` : patientName;
  const doctorName =
    session.doctor?.fullName ||
    session.doctorName ||
    session.doctor?.name ||
    "Doctor";
  const showPrescriptionPanel = isDoctor;
  const identityLabel = isDoctor ? "Patient" : "Doctor";
  const identityDisplayName = isDoctor ? patientDisplayName : doctorName;
  const showMeetingControls = meetingOpen && canOpenMeetingLink;

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-100 p-3 sm:p-4 lg:p-6">
      <div className="mx-auto flex h-full max-w-7xl min-h-0 flex-col">
        <div
          className={`grid flex-1 min-h-0 grid-cols-1 gap-4 lg:gap-6 ${
            showPrescriptionPanel
              ? "lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]"
              : ""
          }`}
        >
          <div className="min-h-0">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-lg">
              <ConsultationHeader
                identityLabel={identityLabel}
                identityDisplayName={identityDisplayName}
                roomName={session.roomName}
                meetingTimer={formatConsultationTime(seconds)}
              />

              <ConsultationVideoSection
                meetingOpen={meetingOpen}
                canOpenMeetingLink={canOpenMeetingLink}
                meetingContainerRef={meetingContainerRef}
                meetingLoading={meetingLoading}
                meetingError={meetingError}
                isDoctor={isDoctor}
                sessionStatus={session.status}
              />

              <ConsultationControls
                isDoctor={isDoctor}
                session={session}
                canOpenMeetingLink={canOpenMeetingLink}
                meetingOpen={meetingOpen}
                showMeetingControls={showMeetingControls}
                audioMuted={audioMuted}
                videoMuted={videoMuted}
                participantsPaneOpen={participantsPaneOpen}
                isDevicePanelOpen={isDevicePanelOpen}
                devicePanelRef={devicePanelRef}
                devicePanelLoading={devicePanelLoading}
                devicePanelError={devicePanelError}
                inviteMessage={inviteMessage}
                audioInputDevices={audioInputDevices}
                audioOutputDevices={audioOutputDevices}
                videoInputDevices={videoInputDevices}
                selectedAudioInputId={selectedAudioInputId}
                selectedAudioOutputId={selectedAudioOutputId}
                selectedVideoInputId={selectedVideoInputId}
                onStartCall={() => {
                  void handleStartCall();
                }}
                onJoinMeeting={() => {
                  void handleJoinMeeting();
                }}
                onToggleAudio={handleToggleAudio}
                onToggleVideo={handleToggleVideo}
                onToggleParticipants={handleToggleParticipants}
                onInvitePeople={() => {
                  void handleInvitePeople();
                }}
                onMeetingSettings={handleMeetingSettings}
                onHangupMeeting={handleHangupMeeting}
                onSelectAudioInput={(device) => {
                  void handleSelectAudioInput(device);
                }}
                onSelectAudioOutput={(device) => {
                  void handleSelectAudioOutput(device);
                }}
                onSelectVideoInput={(device) => {
                  void handleSelectVideoInput(device);
                }}
              />
            </div>
          </div>

          {showPrescriptionPanel ? (
            <div className="min-h-0 overflow-hidden rounded-2xl bg-white p-4 shadow-lg md:p-6">
              <div className="h-full min-h-0">
                {appointmentId && role ? (
                  <PrescriptionForm
                    ref={prescriptionFormRef}
                    role={role}
                    appointmentId={appointmentId}
                    doctorId={session.doctorId}
                    patientId={session.patientId}
                    consultationNotes={notes}
                    onConsultationNotesChange={setNotes}
                    onSaveConsultationNotes={handleSaveNotes}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

      </div>

      <HangupConfirmModal
        open={isHangupConfirmOpen}
        busy={isEndingSession}
        onCancel={() => {
          if (isEndingSession) {
            return;
          }
          setIsHangupConfirmOpen(false);
        }}
        onConfirm={() => {
          void handleEndCall();
        }}
      />

      {appointmentId && role ? (
        <ChatPanel
          appointmentId={appointmentId}
          role={role}
          isChatOpen={isChatOpen}
          unreadChatCount={unreadChatCount}
          canSendMessages={bothParticipantsConnected}
          panelRef={chatPanelRef}
          onToggle={() => setIsChatOpen((current) => !current)}
          onClose={() => setIsChatOpen(false)}
        />
      ) : null}

      {session ? (
        <TelemedicineReportsPanel
          session={session}
          fallbackPatientName={patientName}
        />
      ) : null}
    </div>
  );
}

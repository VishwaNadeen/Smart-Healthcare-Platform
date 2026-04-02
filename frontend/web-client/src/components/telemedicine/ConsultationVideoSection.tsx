import type { RefObject } from "react";
import type { TelemedicineStatus } from "../../services/telemedicineApi";

type ConsultationVideoSectionProps = {
  meetingOpen: boolean;
  canOpenMeetingLink: boolean;
  meetingContainerRef: RefObject<HTMLDivElement | null>;
  meetingLoading: boolean;
  meetingError: string;
  isDoctor: boolean;
  sessionStatus: TelemedicineStatus;
};

export default function ConsultationVideoSection({
  meetingOpen,
  canOpenMeetingLink,
  meetingContainerRef,
  meetingLoading,
  meetingError,
  isDoctor,
  sessionStatus,
}: ConsultationVideoSectionProps) {
  return (
    <div className="relative flex min-h-[16rem] flex-1 items-center justify-center bg-slate-900 px-6 text-center text-white sm:min-h-[20rem]">
      {meetingOpen && canOpenMeetingLink ? (
        <>
          <div
            ref={meetingContainerRef}
            className="h-full w-full overflow-hidden"
          />

          {meetingLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/85 px-6 text-center">
              <p className="text-sm font-medium text-slate-200">
                Loading meeting...
              </p>
            </div>
          ) : null}

          {meetingError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 px-6 text-center">
              <div>
                <p className="text-lg font-semibold">Meeting failed to load</p>
                <p className="mt-2 text-sm text-slate-300">{meetingError}</p>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div>
          <p className="text-lg font-semibold">
            {isDoctor ? "Doctor Consultation Room" : "Patient Consultation Room"}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {sessionStatus === "active"
              ? "The video session is active."
              : sessionStatus === "scheduled"
                ? isDoctor
                  ? "Start the session when you are ready to see the patient."
                  : "Please wait until your doctor starts the consultation."
                : sessionStatus === "completed"
                  ? "This consultation has ended."
                  : "This consultation is not available."}
          </p>
        </div>
      )}
    </div>
  );
}

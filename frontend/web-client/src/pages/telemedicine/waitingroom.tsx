import DoctorWaitingRoom from "./sessionDetails";
import PatientWaitingRoom from "./PatientWaitingRoom";
import TelemedicineAccessNotice from "../../components/telemedicine/TelemedicineAccessNotice";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";

export default function WaitingRoom() {
  const auth = getStoredTelemedicineAuth();

  if (!auth.actorRole) {
    return (
      <TelemedicineAccessNotice
        title="Waiting room needs login data"
        description="Please sign in to continue."
        actionLabel="Go to Login"
      />
    );
  }

  if (auth.actorRole === "doctor") {
    return <DoctorWaitingRoom />;
  }

  if (auth.actorRole === "patient") {
    return <PatientWaitingRoom />;
  }

  return (
    <TelemedicineAccessNotice
      title="Waiting room unavailable"
      description="Unsupported account role."
      actionLabel="Go Back"
    />
  );
}
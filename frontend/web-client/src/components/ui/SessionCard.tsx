import { useNavigate } from "react-router-dom";
import { canJoinMeeting } from "../../utils/time";
import type { TelemedicineSession } from "../../services/telemedicineApi";

type Props = {
  session: TelemedicineSession;
};

export default function SessionCard({ session }: Props) {
  const navigate = useNavigate();

  const canJoin = canJoinMeeting(
    session.scheduledDate,
    session.scheduledTime
  );

  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "16px",
        borderRadius: "10px",
        marginBottom: "16px",
      }}
    >
      <h3>Appointment ID: {session.appointmentId}</h3>
      <p>Doctor ID: {session.doctorId}</p>
      <p>Patient ID: {session.patientId}</p>
      <p>Date: {session.scheduledDate}</p>
      <p>Time: {session.scheduledTime}</p>
      <p>Status: {session.status}</p>

      {canJoin ? (
        <button onClick={() => navigate(`/consultation/${session.appointmentId}`)}>
          Join Consultation
        </button>
      ) : (
        <button disabled>Consultation not available yet</button>
      )}
    </div>
  );
}
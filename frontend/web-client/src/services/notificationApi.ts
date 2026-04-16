import { NOTIFICATION_API_URL } from "../config/api";

export type NotificationType =
  | "APPOINTMENT_BOOKED"
  | "APPOINTMENT_RESCHEDULED"
  | "APPOINTMENT_CANCELLED"
  | "PAYMENT_SUCCESS"
  | "CONSULTATION_COMPLETED";

export type NotificationChannel = "EMAIL" | "SMS" | "BOTH";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";
export type RecipientType = "PATIENT" | "DOCTOR";

export type Notification = {
  _id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipientType: RecipientType;
  recipientId: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  subject: string | null;
  message: string;
  status: NotificationStatus;
  errorMessage: string | null;
  metadata: {
    appointmentId?: string;
    doctorId?: string;
    patientId?: string;
    amount?: number;
    orderId?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type NotificationHistoryResponse = {
  total: number;
  notifications: Notification[];
};

async function handleNotificationResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { message?: string; error?: string })
    | null;

  if (!response.ok) {
    const errorMessage =
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  if (data === null) {
    throw new Error("Empty response received from notification service");
  }

  return data as T;
}

export async function getNotificationHistory(
  recipientId: string
): Promise<NotificationHistoryResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${NOTIFICATION_API_URL}/history/${recipientId}`
    );
  } catch {
    throw new Error(
      "Unable to connect to the notification service. Please check that it is running."
    );
  }

  return handleNotificationResponse<NotificationHistoryResponse>(response);
}

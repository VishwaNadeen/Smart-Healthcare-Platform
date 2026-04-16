import { PAYMENT_API_URL } from "../config/api";

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type Payment = {
  _id: string;
  orderId: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payherePaymentId: string | null;
  payhereStatusCode: string | null;
  payhereStatusMessage: string | null;
  payhereMethod: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InitiatePaymentPayload = {
  patientId: string;
  doctorId: string;
  appointmentId: string;
  amount: number;
  currency?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type PayHereParams = {
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: string;
  amount: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  hash: string;
};

export type InitiatePaymentResponse = {
  checkoutUrl: string;
  params: PayHereParams;
};

export type PatientPaymentHistoryResponse = {
  total: number;
  payments: Payment[];
};

export type DoctorPaymentHistoryResponse = {
  total: number;
  totalEarnings: number;
  payments: Payment[];
};

async function handlePaymentResponse<T>(response: Response): Promise<T> {
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
    throw new Error("Empty response received from payment service");
  }

  return data as T;
}

export async function initiatePayment(
  payload: InitiatePaymentPayload
): Promise<InitiatePaymentResponse> {
  let response: Response;

  try {
    response = await fetch(`${PAYMENT_API_URL}/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Unable to connect to the payment service. Please check that it is running."
    );
  }

  return handlePaymentResponse<InitiatePaymentResponse>(response);
}

export async function getPaymentStatus(orderId: string): Promise<Payment> {
  let response: Response;

  try {
    response = await fetch(`${PAYMENT_API_URL}/${orderId}`);
  } catch {
    throw new Error(
      "Unable to connect to the payment service. Please check that it is running."
    );
  }

  return handlePaymentResponse<Payment>(response);
}

export async function getPatientPaymentHistory(
  patientId: string
): Promise<PatientPaymentHistoryResponse> {
  let response: Response;

  try {
    response = await fetch(`${PAYMENT_API_URL}/patient/${patientId}`);
  } catch {
    throw new Error(
      "Unable to connect to the payment service. Please check that it is running."
    );
  }

  return handlePaymentResponse<PatientPaymentHistoryResponse>(response);
}
export async function getDoctorPaymentHistory(
  doctorId: string,
  token: string
): Promise<DoctorPaymentHistoryResponse> {
  let response: Response;

  try {
    response = await fetch(`${PAYMENT_API_URL}/doctor/${doctorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error(
      "Unable to connect to the payment service. Please check that it is running."
    );
  }

  return handlePaymentResponse<DoctorPaymentHistoryResponse>(response);
}


export function getReceiptUrl(orderId: string): string {
  return `${PAYMENT_API_URL}/${orderId}/receipt`;
}

export type PatientStatus = "active" | "inactive";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type PatientAppointmentStats = {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
};

export type Patient = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode?: string;
  phone?: string;
  birthday?: string;
  gender?: "male" | "female" | "other" | "";
  address?: string;
  country?: string;
  status?: PatientStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type PatientUpdatePayload = {
  firstName: string;
  lastName: string;
  email: string;
  countryCode?: string;
  phone?: string;
  birthday?: string;
  gender?: "male" | "female" | "other" | "";
  address?: string;
  country?: string;
};

export type PatientListResponse = {
  patients: Patient[];
  total?: number;
};

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
  authUserId?: string;
  title?: "Mr" | "Miss" | "Mrs" | "";
  firstName: string;
  lastName: string;
  nic?: string;
  email: string;
  countryCode?: string;
  phone?: string;
  birthday?: string;
  address?: string;
  country?: string;
  status?: PatientStatus;
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PatientUpdatePayload = {
  title?: "Mr" | "Miss" | "Mrs" | "";
  firstName: string;
  lastName: string;
  nic?: string;
  email: string;
  countryCode?: string;
  phone?: string;
  birthday?: string;
  address?: string;
  country?: string;
};

export type PatientListResponse = {
  patients: Patient[];
  total?: number;
};

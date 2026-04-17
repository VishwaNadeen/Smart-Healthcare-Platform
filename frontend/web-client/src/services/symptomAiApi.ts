import { getStoredTelemedicineAuth } from "../utils/telemedicineAuth";

const AI_SYMPTOM_API_BASE =
  import.meta.env.VITE_AI_SYMPTOM_API_URL || "http://localhost:5010/api/symptoms";

export type ChatMessage = {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
};

export type SymptomQuestion = {
  id: string;
  question: string;
  type: "boolean" | "number";
};

export type SymptomCheckRecord = {
  _id: string;
  flowType: "form" | "chat";
  conversationStage: "collecting" | "completed" | "closed";
  initialMessage?: string;
  currentQuestionId?: string;
  currentQuestion?: SymptomQuestion | null;
  symptoms: Record<string, unknown>;
  analysis?: {
    urgency: "low" | "medium" | "high";
    category: string;
    department: string;
    nextStep: string;
    redFlags: string[];
    disclaimer: string;
  };
  recommendation?: {
    shouldBookAppointment: boolean;
    shouldStartTelemedicine: boolean;
    emergency: boolean;
  };
  aiExplanation: string;
  chatHistory: ChatMessage[];
  status: "completed" | "follow_up_pending" | "closed";
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

function getAuthHeaders() {
  const auth = getStoredTelemedicineAuth();
  const token = auth?.token || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getSymptomQuestions(): Promise<SymptomQuestion[]> {
  const response = await fetch(`${AI_SYMPTOM_API_BASE}/questions`, {
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<SymptomQuestion[]> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch symptom questions.");
  }

  return result.data;
}

export async function startSymptomConversation(
  message: string
): Promise<SymptomCheckRecord> {
  const response = await fetch(`${AI_SYMPTOM_API_BASE}/start`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });

  const result: ApiResponse<SymptomCheckRecord> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to start symptom conversation.");
  }

  return result.data;
}

export async function analyzeSymptoms(payload: {
  [key: string]: unknown;
}): Promise<SymptomCheckRecord> {
  const response = await fetch(`${AI_SYMPTOM_API_BASE}/analyze`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const result: ApiResponse<SymptomCheckRecord> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to analyze symptoms.");
  }

  return result.data;
}

export async function getSymptomCheckById(id: string): Promise<SymptomCheckRecord> {
  const response = await fetch(`${AI_SYMPTOM_API_BASE}/${id}`, {
    headers: getAuthHeaders(),
  });

  const result: ApiResponse<SymptomCheckRecord> = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch symptom check.");
  }

  return result.data;
}

export async function sendSymptomChatMessage(
  id: string,
  message: string
): Promise<{
  symptomCheckId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  chatHistory: ChatMessage[];
  symptomCheck: SymptomCheckRecord;
}> {
  const response = await fetch(`${AI_SYMPTOM_API_BASE}/chat/${id}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to send chat message.");
  }

  return result.data;
}

export async function getSymptomHistory(
  patientId: string,
  options?: { page?: number; limit?: number }
): Promise<{
  records: SymptomCheckRecord[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;

  const response = await fetch(
    `${AI_SYMPTOM_API_BASE}/history/${patientId}?page=${page}&limit=${limit}`,
    {
      headers: getAuthHeaders(),
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch symptom history.");
  }

  return {
    records: result.data,
    totalCount: result.totalCount ?? 0,
    page: result.page ?? page,
    limit: result.limit ?? limit,
    hasMore: Boolean(result.hasMore),
  };
}

export async function getLatestSymptomCheck(): Promise<SymptomCheckRecord | null> {
  const response = await fetch(`${AI_SYMPTOM_API_BASE}/latest/me`, {
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch latest symptom check.");
  }

  return result.data ?? null;
}

export async function closeSymptomCheck(id: string): Promise<SymptomCheckRecord> {
  const response = await fetch(`${AI_SYMPTOM_API_BASE}/${id}/close`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to close symptom check.");
  }

  return result.data;
}

export async function reopenSymptomCheck(id: string): Promise<SymptomCheckRecord> {
  const response = await fetch(`${AI_SYMPTOM_API_BASE}/${id}/reopen`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to reopen symptom check.");
  }

  return result.data;
}
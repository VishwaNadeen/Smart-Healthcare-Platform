const AI_SYMPTOM_API_BASE =
  import.meta.env.VITE_AI_SYMPTOM_API_URL || "http://localhost:5010/api/symptoms";

export type ChatMessage = {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
};

export type SymptomCheckRecord = {
  _id: string;
  patientId: string;
  symptoms: Record<string, unknown>;
  analysis: {
    urgency: "low" | "medium" | "high";
    category: string;
    department: string;
    nextStep: string;
    redFlags: string[];
    disclaimer: string;
  };
  recommendation: {
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

export async function getSymptomCheckById(id: string): Promise<SymptomCheckRecord> {
  const response = await fetch(`${AI_SYMPTOM_API_BASE}/${id}`);

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
}> {
  const response = await fetch(`${AI_SYMPTOM_API_BASE}/chat/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to send chat message.");
  }

  return result.data;
}
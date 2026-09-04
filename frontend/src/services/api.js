// =========================================================
// API CONFIGURATION
// =========================================================

const API_BASE_URL = "http://127.0.0.1:8000";


// =========================================================
// GET ACCESS TOKEN
// =========================================================

function getAccessToken() {
  return localStorage.getItem("access_token");
}


// =========================================================
// GENERATE CONVERSATION ID
// =========================================================

export function createConversationId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `conversation-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}`;
}


// =========================================================
// GENERIC API REQUEST
// =========================================================

export async function apiRequest(
  endpoint,
  options = {}
) {
  const token = getAccessToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage =
      data?.detail ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  return data;
}


// =========================================================
// AI CHAT API
// =========================================================

export async function sendAIMessage({
  message,
  language = "auto",
  conversationId
}) {
  if (!message || !message.trim()) {
    throw new Error("Message cannot be empty.");
  }

  const finalConversationId =
    conversationId || createConversationId();

  return apiRequest(
    "/ai/chat",
    {
      method: "POST",

      body: JSON.stringify({
        message: message.trim(),
        language,
        conversation_id: finalConversationId
      })
    }
  );
}


// =========================================================
// EXPORT API BASE URL
// =========================================================

export { API_BASE_URL };
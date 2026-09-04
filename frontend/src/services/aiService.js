import { API_BASE_URL } from "./api";

// =========================================================
// CONVERSATION ID MANAGEMENT
// =========================================================

export function getOrCreateConversationId() {
  const existing = sessionStorage.getItem("kc_assistant_conversation_id");
  if (existing) {
    return existing;
  }
  const newId = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    ? crypto.randomUUID()
    : `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  sessionStorage.setItem("kc_assistant_conversation_id", newId);
  return newId;
}

export function resetConversationId() {
  const newId = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    ? crypto.randomUUID()
    : `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  sessionStorage.setItem("kc_assistant_conversation_id", newId);
  return newId;
}

// =========================================================
// GET STORED ACCESS TOKEN
// =========================================================

function getAuthHeader() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// =========================================================
// LOCALIZED USER-FRIENDLY ERROR MESSAGES
// (No raw 404, 429, 500, ClientError exposed to collector)
// =========================================================

export function getFriendlyErrorMessage(language = "hi", errorType = "generic") {
  if (language === "mr") {
    switch (errorType) {
      case "rate_limit":
        return "सध्या खूप जास्त विनंत्या येत आहेत. कृपया 1 मिनिटानंतर पुन्हा प्रयत्न करा.";
      case "network":
        return "इंटरनेट कनेक्शन थोडे कमजोर दिसत आहे. पुन्हा प्रयत्न करा.";
      case "timeout":
        return "वेळ जास्त लागत आहे. कृपया पुन्हा एकदा विचारा.";
      default:
        return "काही तांत्रिक अडचण आली आहे. कृपया पुन्हा प्रयत्न करा.";
    }
  } else if (language === "en") {
    switch (errorType) {
      case "rate_limit":
        return "High traffic right now. Please try again in a moment.";
      case "network":
        return "Internet connection seems weak. Please try again.";
      case "timeout":
        return "Request timed out. Please ask again.";
      default:
        return "A temporary issue occurred. Please try again.";
    }
  } else {
    // Hindi / Hinglish default
    switch (errorType) {
      case "rate_limit":
        return "Abhi request zyada aa rahi hain. Kripya thoda ruk kar dobara try karein.";
      case "network":
        return "Internet connection kamzor lag raha hai. Aap dobara try karein.";
      case "timeout":
        return "Response aane mein samay lag raha hai. Dobara poochiye.";
      default:
        return "Thodi technical problem aa gayi. Kripya dobara try karein.";
    }
  }
}

// =========================================================
// SEND AI MESSAGE WITH AUTOMATIC 2-STAGE RETRY
// =========================================================

export async function sendAIMessage({
  message,
  language = "auto",
  conversationId
}) {
  if (!message || !message.trim()) {
    throw new Error("Message cannot be empty.");
  }

  const finalConversationId = conversationId || getOrCreateConversationId();
  const authHeaders = getAuthHeader();

  const payload = {
    message: message.trim(),
    language,
    conversation_id: finalConversationId
  };

  let lastError = null;

  // 2-stage retry
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        data = null;
      }

      if (response.ok && data) {
        return data;
      }

      if (response.status === 429) {
        throw new Error(getFriendlyErrorMessage(language, "rate_limit"));
      }

      throw new Error(data?.detail || getFriendlyErrorMessage(language, "generic"));
    } catch (err) {
      lastError = err;
      if (err.name === "AbortError") {
        lastError = new Error(getFriendlyErrorMessage(language, "timeout"));
      } else if (!navigator.onLine || err.message?.includes("fetch")) {
        lastError = new Error(getFriendlyErrorMessage(language, "network"));
      }

      // Small backoff before attempt 2
      if (attempt === 1) {
        await new Promise((res) => setTimeout(res, 600));
      }
    }
  }

  throw lastError || new Error(getFriendlyErrorMessage(language, "generic"));
}

// =========================================================
// IDENTIFY MATERIAL FROM PHOTO (MULTIMODAL)
// =========================================================

export async function identifyMaterialPhoto({
  file,
  language = "auto",
  conversationId
}) {
  if (!file) {
    throw new Error("Please select an image file.");
  }

  const finalConversationId = conversationId || getOrCreateConversationId();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", language);
  formData.append("conversation_id", finalConversationId);

  try {
    const response = await fetch(`${API_BASE_URL}/ai/identify-photo`, {
      method: "POST",
      headers: {
        ...getAuthHeader()
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || getFriendlyErrorMessage(language, "generic"));
    }
    return data;
  } catch (err) {
    console.error("Photo identification error:", err);
    throw new Error(getFriendlyErrorMessage(language, "network"));
  }
}

// =========================================================
// CONFIRM TRANSACTION ACTION (SELL LOT / ACCEPT OFFER)
// =========================================================

export async function confirmAIAction({
  actionType,
  targetId,
  conversationId
}) {
  const response = await fetch(`${API_BASE_URL}/ai/confirm-action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader()
    },
    body: JSON.stringify({
      action_type: actionType,
      target_id: String(targetId),
      conversation_id: conversationId || getOrCreateConversationId()
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || "Action failed.");
  }
  return data;
}

// =========================================================
// SEND VOICE DIALOGUE (GEMINI VOICE ASSISTANT)
// =========================================================

export async function sendVoiceDialogue({
  speechText,
  language = "hi",
  latitude = null,
  longitude = null,
  locationName = null,
  conversationId = null
}) {
  if (!speechText || !speechText.trim()) {
    throw new Error("Speech text cannot be empty.");
  }

  const finalConversationId = conversationId || getOrCreateConversationId();
  const authHeaders = getAuthHeader();

  const payload = {
    speech_text: speechText.trim(),
    language,
    latitude,
    longitude,
    location_name: locationName,
    conversation_id: finalConversationId
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${API_BASE_URL}/ai/voice-dialogue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.detail || getFriendlyErrorMessage(language, "generic"));
    }
    return data;
  } catch (err) {
    console.error("Voice dialogue request failed:", err);
    if (err.name === "AbortError") {
      throw new Error(getFriendlyErrorMessage(language, "timeout"));
    }
    throw new Error(getFriendlyErrorMessage(language, "network"));
  }
}

// =========================================================
// FETCH STANDARD MATERIALS
// =========================================================

export async function fetchStandardMaterials() {
  try {
    const res = await fetch(`${API_BASE_URL}/ai/materials`);
    if (res.ok) {
      const json = await res.json();
      return json.materials || [];
    }
  } catch (e) {
    console.warn("Could not fetch standard materials from API:", e);
  }
  return [];
}



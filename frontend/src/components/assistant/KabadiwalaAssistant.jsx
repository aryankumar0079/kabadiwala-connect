import React, { useState, useEffect, useRef } from "react";
import AssistantHeader from "./AssistantHeader";
import AssistantMessageList from "./AssistantMessageList";
import AssistantComposer from "./AssistantComposer";
import QuickActionPills from "./QuickActionPills";
import {
  sendAIMessage,
  identifyMaterialPhoto,
  confirmAIAction,
  getOrCreateConversationId,
  resetConversationId,
  getFriendlyErrorMessage
} from "../../services/aiService";

export default function KabadiwalaAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("kc_assistant_language") || null;
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(getOrCreateConversationId);
  const [showMaterialShortcuts, setShowMaterialShortcuts] = useState(false);

  // History stack for Back button navigation
  const [historyStack, setHistoryStack] = useState([]);

  // Voice narration helper
  const speakAssistantText = (text) => {
    if (!window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[#*`_~]/g, "").replace(/\n+/g, ". ");
      const utterance = new SpeechSynthesisUtterance(clean);
      if (language === "mr") {
        utterance.lang = "mr-IN";
      } else if (language === "en") {
        utterance.lang = "en-IN";
      } else {
        utterance.lang = "hi-IN";
      }
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS error:", e);
    }
  };

  // Open Assistant handler
  const handleOpen = () => {
    setIsOpen(true);
    setHistoryStack(["main"]);
    if (language && messages.length === 0) {
      initializeWelcome(language);
    }
  };

  // Close Assistant handler
  const handleClose = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsOpen(false);
  };

  // Back button handler
  const handleBack = () => {
    if (showMaterialShortcuts) {
      setShowMaterialShortcuts(false);
      return;
    }
    if (historyStack.length > 1) {
      setHistoryStack((prev) => prev.slice(0, -1));
    } else {
      handleClose();
    }
  };

  // Choose language handler (Step 1)
  const handleChooseLanguage = (selectedLang) => {
    setLanguage(selectedLang);
    localStorage.setItem("kc_assistant_language", selectedLang);
    const newConvId = resetConversationId();
    setConversationId(newConvId);
    initializeWelcome(selectedLang);
  };

  // Welcome message initialization
  const initializeWelcome = (lang) => {
    const greetings = {
      hi: "Namaste! 🙏 Main Kabadiwala Connect Assistant hoon.\nAapki kis tarah madad kar sakta hoon?",
      mr: "नमस्कार! 🙏 मी Kabadiwala Connect Assistant आहे.\nमी तुमची कशी मदत करू शकतो?",
      en: "Hello! 🙏 I am your Kabadiwala Connect Assistant.\nHow can I help you today?"
    };

    const text = greetings[lang] || greetings.hi;
    const initialMsg = {
      id: "welcome-1",
      sender: "assistant",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      card_type: null,
      card_data: null
    };

    setMessages([initialMsg]);
    // Speak welcome
    setTimeout(() => speakAssistantText(text), 300);
  };

  // Start fresh conversation (New Chat)
  const handleNewChat = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    const newConvId = resetConversationId();
    setConversationId(newConvId);
    setShowMaterialShortcuts(false);
    if (language) {
      initializeWelcome(language);
    } else {
      setMessages([]);
    }
  };

  // Send message pipeline
  const handleSendMessage = async (textToSend, customCard = null) => {
    if (!textToSend || !textToSend.trim() || loading) return;

    const userText = textToSend.trim();
    setInput("");
    setShowMaterialShortcuts(false);

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message immediately
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
      time: nowTime
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await sendAIMessage({
        message: userText,
        language: language || "auto",
        conversationId
      });

      const assistantReplyText = result.reply || "Aapke liye information check kar raha hoon.";

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        text: assistantReplyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        card_type: result.card_type || null,
        card_data: result.card_data || null,
        quick_actions: result.quick_actions || []
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakAssistantText(assistantReplyText);
    } catch (err) {
      console.error("AI Assistant send error:", err);
      const friendlyErr = getFriendlyErrorMessage(language, "generic");
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: friendlyErr,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          card_type: null,
          card_data: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Quick Action selection
  const handleQuickAction = (actionPrompt, actionId) => {
    if (actionId === "rate" || actionId === "material_rate") {
      setShowMaterialShortcuts(true);
      const promptText = language === "mr" ? "कोणत्या साहित्याचा दर पाहायचा आहे?" : language === "en" ? "Which material rate do you want to check?" : "Kis material ka rate dekhna chahte hain?";
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: "assistant",
          text: promptText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          card_type: null,
          card_data: null
        }
      ]);
      speakAssistantText(promptText);
      return;
    }

    handleSendMessage(actionPrompt);
  };

  // Material shortcut click
  const handleSelectMaterial = (matKey, matLabel) => {
    setShowMaterialShortcuts(false);
    handleSendMessage(`${matKey} ka current rate kya hai?`);
  };

  // Photo upload & Gemini Vision identification
  const handlePhotoSelected = async (file) => {
    if (!file || loading) return;

    const previewUrl = URL.createObjectURL(file);
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // User message with image
    setMessages((prev) => [
      ...prev,
      {
        id: `user-photo-${Date.now()}`,
        sender: "user",
        text: language === "mr" ? "मी साहित्याचा फोटो पाठवला आहे." : language === "en" ? "I uploaded a scrap photo." : "Maine material ka photo bheja hai.",
        imageUrl: previewUrl,
        time: nowTime
      }
    ]);

    setLoading(true);

    try {
      const res = await identifyMaterialPhoto({
        file,
        language: language || "auto",
        conversationId
      });

      if (res.success && res.data) {
        const asstText = res.data.description || (language === "mr" ? "मी फोटो तपासला आहे. तपशील खाली पहा:" : language === "en" ? "I analyzed the photograph. Here are the details:" : "Maine photo check kiya hai. Neeche details dekhein:");

        setMessages((prev) => [
          ...prev,
          {
            id: `asst-photo-${Date.now()}`,
            sender: "assistant",
            text: asstText,
            imageUrl: previewUrl,
            card_type: "photo",
            card_data: res.data,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        speakAssistantText(asstText);
      } else {
        throw new Error(res.fallback_message || "Photo analysis failed.");
      }
    } catch (err) {
      console.error("Photo identification error:", err);
      const errText = language === "mr" ? "फोटो स्पष्ट दिसत नाही. कृपया पुन्हा एकदा चांगला फोटो पाठवा." : language === "en" ? "Could not identify photo clearly. Please take another clear picture." : "Photo saaf nahi lag rahi hai. Kripya ek aur clear photo bhejiye.";
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-err-${Date.now()}`,
          sender: "assistant",
          text: errText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      speakAssistantText(errText);
    } finally {
      setLoading(false);
    }
  };

  // Photo identification confirmation
  const handlePhotoConfirm = (category, subCategory) => {
    handleSendMessage(`Haan, ye ${subCategory || category} hai. Iska rate aur recycler batao.`);
  };

  const handlePhotoReject = () => {
    handleSendMessage("Nahi, ye material alag hai. Mujhe specific rate dekhna hai.");
    setShowMaterialShortcuts(true);
  };

  // Sell to specific recycler flow
  const handleSellToRecycler = (recycler) => {
    // Show confirmation card first (Confirmation Policy)
    const confirmData = {
      title: language === "mr" ? `${recycler.recycler_name} यांना माल विकायचा आहे का?` : language === "en" ? `Sell material lot to ${recycler.recycler_name}?` : `Kya aap ${recycler.recycler_name} ko material bechna chahte hain?`,
      description: language === "mr" ? `दर: ${recycler.offered_rate} | ठिकाण: ${recycler.location}` : `Rate: ${recycler.offered_rate} | Location: ${recycler.location}`,
      targetType: "sell_lot",
      targetId: recycler.recycler_id,
      details: {
        "Recycler": recycler.recycler_name,
        "Offered Rate": recycler.offered_rate,
        "Pickup": recycler.pickup_available ? "Available" : "Self Drop"
      }
    };

    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-${Date.now()}`,
        sender: "assistant",
        text: language === "mr" ? "कृपया खालील विक्री कन्फर्म करा:" : language === "en" ? "Please confirm the sale request details:" : "Kripya sale request confirm karein:",
        card_type: "confirmation",
        card_data: confirmData,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  // Final Action confirmation executed
  const handleExecuteConfirmedAction = async (actionType, targetId) => {
    setLoading(true);
    try {
      const res = await confirmAIAction({
        actionType,
        targetId,
        conversationId
      });

      const replyMsg = res.message || "Action successfully completed!";
      setMessages((prev) => [
        ...prev,
        {
          id: `done-${Date.now()}`,
          sender: "assistant",
          text: `✅ ${replyMsg}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      speakAssistantText(replyMsg);
    } catch (err) {
      console.error("Action confirmation error:", err);
      const errMsg = err.message || "Action failed. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: `action-err-${Date.now()}`,
          sender: "assistant",
          text: `⚠️ ${errMsg}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAction = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `cancel-${Date.now()}`,
        sender: "assistant",
        text: language === "mr" ? "प्रक्रिया रद्द केली आहे. इतर काही मदत हवी असल्यास सांगा." : language === "en" ? "Action cancelled. Let me know if you need anything else." : "Action cancel kar di gayi hai. Aap kuch aur poochna chahein toh bataiye.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  return (
    <>
      {/* =======================================================
          FLOATING ASSISTANT LAUNCHER (DESKTOP / MOBILE)
          (Modern Circular Economy Branding + Gentle Pulse)
         ======================================================= */}
      {!isOpen && (
        <div style={launcherWrapperStyle}>
          {/* Label Tooltip */}
          <div style={launcherTooltipStyle}>
            ♻️ Kabadiwala Assistant
          </div>

          <button
            type="button"
            onClick={handleOpen}
            aria-label="Open Kabadiwala Assistant"
            title="Kabadiwala Assistant"
            style={launcherButtonStyle}
          >
            {/* Custom Circular Economy Recycling Icon */}
            <span style={iconInnerContainerStyle}>
              ♻
              <span style={chatBubbleAccentStyle} />
              <span style={chatBubbleDotStyle} />
            </span>
          </button>
        </div>
      )}

      {/* =======================================================
          ASSISTANT WINDOW / MODAL (ZERO-CLIPPING VIEWPORT)
         ======================================================= */}
      {isOpen && (
        <div style={assistantOverlayStyle}>
          <div style={assistantPanelStyle}>
            {/* Header with Back, Brand, Language Switcher, Refresh/New Chat */}
            <AssistantHeader
              language={language || "hi"}
              onBack={handleBack}
              onLanguageChange={handleChooseLanguage}
              onNewChat={handleNewChat}
            />

            {/* If Language not selected yet (Step 1) */}
            {!language ? (
              <div style={languageStepContainerStyle}>
                <div style={langPromptBoxStyle}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>👋</div>
                  <div style={{ fontSize: "17px", fontWeight: 800, color: "#111827", marginBottom: "4px" }}>
                    Apni Bhasha Chunein
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>
                    Select your preferred language
                  </div>
                </div>

                <div style={{ display: "grid", gap: "10px", width: "100%" }}>
                  <button
                    type="button"
                    onClick={() => handleChooseLanguage("hi")}
                    style={langSelectCardStyle}
                  >
                    <span style={{ fontSize: "20px" }}>🇮🇳</span>
                    <div style={{ textAlign: "left", flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: "#111827" }}>हिंदी (Hindi)</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>सरल हिंदी में बात करें</div>
                    </div>
                    <span style={{ color: "#1b7f3a", fontSize: "18px", fontWeight: 800 }}>›</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChooseLanguage("mr")}
                    style={langSelectCardStyle}
                  >
                    <span style={{ fontSize: "20px" }}>🇮🇳</span>
                    <div style={{ textAlign: "left", flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: "#111827" }}>मराठी (Marathi)</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>सोप्या मराठीत बोला</div>
                    </div>
                    <span style={{ color: "#1b7f3a", fontSize: "18px", fontWeight: 800 }}>›</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChooseLanguage("en")}
                    style={langSelectCardStyle}
                  >
                    <span style={{ fontSize: "20px" }}>🇬🇧</span>
                    <div style={{ textAlign: "left", flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: "15px", color: "#111827" }}>English</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>Chat in simple English</div>
                    </div>
                    <span style={{ color: "#1b7f3a", fontSize: "18px", fontWeight: 800 }}>›</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Chat Message List + Quick Actions */
              <>
                <AssistantMessageList
                  messages={messages}
                  loading={loading}
                  language={language}
                  onActionClick={handleSendMessage}
                  onConfirmAction={handleExecuteConfirmedAction}
                  onCancelAction={handleCancelAction}
                  onPhotoConfirm={handlePhotoConfirm}
                  onPhotoReject={handlePhotoReject}
                  onSellToRecycler={handleSellToRecycler}
                  onSpeakText={speakAssistantText}
                />

                {/* Show initial quick action pills if only welcome message is visible */}
                {messages.length === 1 && (
                  <div style={{ padding: "0 14px 10px", background: "#f8fafc" }}>
                    <QuickActionPills
                      language={language}
                      onSelectAction={handleQuickAction}
                      showMaterialShortcuts={showMaterialShortcuts}
                      onSelectMaterial={handleSelectMaterial}
                      disabled={loading}
                    />
                  </div>
                )}

                {/* If user tapped 'Aaj ka Rate' button, show material selection shortcuts */}
                {showMaterialShortcuts && messages.length > 1 && (
                  <div style={{ padding: "0 14px 10px", background: "#f8fafc" }}>
                    <QuickActionPills
                      language={language}
                      onSelectAction={handleQuickAction}
                      showMaterialShortcuts={true}
                      onSelectMaterial={handleSelectMaterial}
                      disabled={loading}
                    />
                  </div>
                )}

                {/* Bottom Composer Bar */}
                <AssistantComposer
                  input={input}
                  onChangeInput={setInput}
                  onSendMessage={handleSendMessage}
                  onPhotoSelected={handlePhotoSelected}
                  onSpeechResult={(transcript) => handleSendMessage(transcript)}
                  loading={loading}
                  language={language}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Global CSS for Animations and Viewport Protection */}
      <style>
        {`
          @keyframes assistantPulseAnim {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 8px 24px rgba(0,0,0,0.18);
            }
            50% {
              transform: scale(1.06);
              box-shadow: 0 12px 28px rgba(27,127,58,0.38);
            }
          }

          @media (max-width: 540px) {
            .kc-assistant-panel {
              width: 100vw !important;
              height: 100dvh !important;
              max-height: 100dvh !important;
              border-radius: 0px !important;
              right: 0px !important;
              bottom: 0px !important;
              top: 0px !important;
              left: 0px !important;
            }
          }
        `}
      </style>
    </>
  );
}

// =========================================================
// STYLES
// =========================================================

const launcherWrapperStyle = {
  position: "fixed",
  right: "22px",
  bottom: "22px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  zIndex: 1000
};

const launcherTooltipStyle = {
  background: "#ffffff",
  color: "#111827",
  padding: "8px 14px",
  borderRadius: "12px",
  boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
  border: "1px solid #e5e7eb",
  fontSize: "13px",
  fontWeight: 800,
  whiteSpace: "nowrap"
};

const launcherButtonStyle = {
  width: "68px",
  height: "68px",
  borderRadius: "50%",
  border: "none",
  background: "#1b7f3a",
  color: "#ffffff",
  fontSize: "26px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  animation: "assistantPulseAnim 2s infinite ease-in-out"
};

const iconInnerContainerStyle = {
  position: "relative",
  width: "32px",
  height: "32px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  lineHeight: 1
};

const chatBubbleAccentStyle = {
  position: "absolute",
  right: "-4px",
  bottom: "-3px",
  width: "16px",
  height: "12px",
  borderRadius: "8px 8px 8px 2px",
  background: "#ffffff",
  display: "block"
};

const chatBubbleDotStyle = {
  position: "absolute",
  right: "0px",
  bottom: "-1px",
  width: "8px",
  height: "6px",
  borderRadius: "1px 1px 6px 1px",
  background: "#1b7f3a",
  display: "block"
};

const assistantOverlayStyle = {
  position: "fixed",
  right: "22px",
  bottom: "22px",
  zIndex: 1001
};

const assistantPanelStyle = {
  width: "min(410px, calc(100vw - 24px))",
  height: "min(660px, calc(100dvh - 36px))",
  maxHeight: "90vh",
  background: "#ffffff",
  borderRadius: "18px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
  border: "1px solid #e5e7eb",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxSizing: "border-box"
};

const languageStepContainerStyle = {
  flex: 1,
  padding: "20px 16px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc",
  overflowY: "auto"
};

const langPromptBoxStyle = {
  background: "#ffffff",
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  textAlign: "center",
  width: "100%",
  marginBottom: "16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
};

const langSelectCardStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "14px",
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  cursor: "pointer",
  transition: "all 0.15s ease",
  boxShadow: "0 2px 6px rgba(0,0,0,0.02)"
};

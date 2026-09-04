import React, { useState } from "react";

export default function AssistantHeader({
  language = "hi",
  onBack,
  onLanguageChange,
  onNewChat
}) {
  const [showConfirmNewChat, setShowConfirmNewChat] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const labels = {
    hi: {
      title: "Kabadiwala Assistant",
      subtitle: "आपका स्क्रैप साथी (24/7)",
      newChatPrompt: "नई बातचीत शुरू करें?",
      newChatNote: "पुरानी चैट खाली हो जाएगी लेकिन आपका डेटा सुरक्षित रहेगा।",
      startNewBtn: "हाँ, नई चैट शुरू करें",
      cancelBtn: "रद्द करें",
      langTitle: "भाषा बदलें"
    },
    mr: {
      title: "Kabadiwala Assistant",
      subtitle: "तुमचा स्क्रॅप मार्गदर्शक (24/7)",
      newChatPrompt: "नवीन संभाषण सुरू करायचे का?",
      newChatNote: "जुनी चॅट साफ होईल परंतु तुमचा डेटा सुरक्षित राहील.",
      startNewBtn: "हो, नवीन चॅट सुरू करा",
      cancelBtn: "रद्द करा",
      langTitle: "भाषा बदला"
    },
    en: {
      title: "Kabadiwala Assistant",
      subtitle: "Your Scrap Companion (24/7)",
      newChatPrompt: "Start a new conversation?",
      newChatNote: "Current chat will reset. Your account data remains safe.",
      startNewBtn: "Start New Chat",
      cancelBtn: "Cancel",
      langTitle: "Change Language"
    }
  }[language] || labels?.hi;

  const currentLangLabel = {
    hi: "🇮🇳 हिंदी",
    mr: "🇮🇳 मराठी",
    en: "🇬🇧 English"
  }[language] || "🇮🇳 हिंदी";

  const handleConfirmNewChat = () => {
    setShowConfirmNewChat(false);
    if (onNewChat) {
      onNewChat();
    }
  };

  return (
    <div style={headerContainerStyle}>
      {/* Top Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Back and Brand Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              style={iconButtonStyle}
            >
              ←
            </button>
          )}

          {/* Recycling Circular Economy Branded Icon */}
          <div style={brandIconWrapperStyle}>
            <span style={{ fontSize: "19px" }}>♻️</span>
          </div>

          <div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#ffffff", letterSpacing: "0.2px" }}>
              {labels.title}
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
              {labels.subtitle}
            </div>
          </div>
        </div>

        {/* Right Tools: Language Badge & New Chat Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Language Switch Button */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              style={langBadgeBtnStyle}
              title={labels.langTitle}
            >
              {currentLangLabel} ▾
            </button>

            {showLangMenu && (
              <div style={langDropdownStyle}>
                <div
                  onClick={() => { onLanguageChange("hi"); setShowLangMenu(false); }}
                  style={{ ...langOptionStyle, fontWeight: language === "hi" ? 800 : 500 }}
                >
                  🇮🇳 हिंदी (Hindi)
                </div>
                <div
                  onClick={() => { onLanguageChange("mr"); setShowLangMenu(false); }}
                  style={{ ...langOptionStyle, fontWeight: language === "mr" ? 800 : 500 }}
                >
                  🇮🇳 मराठी (Marathi)
                </div>
                <div
                  onClick={() => { onLanguageChange("en"); setShowLangMenu(false); }}
                  style={{ ...langOptionStyle, fontWeight: language === "en" ? 800 : 500 }}
                >
                  🇬🇧 English
                </div>
              </div>
            )}
          </div>

          {/* Refresh / New Chat */}
          <button
            type="button"
            onClick={() => setShowConfirmNewChat(true)}
            aria-label="New Conversation"
            title="New Conversation"
            style={iconButtonStyle}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Confirmation Modal for New Chat */}
      {showConfirmNewChat && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>↻</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", marginBottom: "6px" }}>
              {labels.newChatPrompt}
            </div>
            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", lineHeight: 1.4 }}>
              {labels.newChatNote}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={handleConfirmNewChat}
                style={{ ...modalBtnStyle, background: "#1b7f3a", color: "#ffffff" }}
              >
                {labels.startNewBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmNewChat(false)}
                style={{ ...modalBtnStyle, background: "#f3f4f6", color: "#374151" }}
              >
                {labels.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const headerContainerStyle = {
  background: "#1b7f3a",
  color: "#ffffff",
  padding: "12px 14px",
  borderTopLeftRadius: "18px",
  borderTopRightRadius: "18px",
  position: "relative",
  zIndex: 10
};

const brandIconWrapperStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  background: "rgba(255, 255, 255, 0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const iconButtonStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  border: "none",
  background: "rgba(255, 255, 255, 0.18)",
  color: "#ffffff",
  fontSize: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.15s ease"
};

const langBadgeBtnStyle = {
  padding: "4px 8px",
  background: "rgba(255, 255, 255, 0.2)",
  color: "#ffffff",
  border: "none",
  borderRadius: "14px",
  fontSize: "11px",
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const langDropdownStyle = {
  position: "absolute",
  top: "100%",
  right: 0,
  marginTop: "6px",
  background: "#ffffff",
  color: "#111827",
  borderRadius: "10px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
  zIndex: 50,
  minWidth: "140px"
};

const langOptionStyle = {
  padding: "9px 12px",
  fontSize: "12px",
  cursor: "pointer",
  borderBottom: "1px solid #f3f4f6"
};

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: "20px"
};

const modalContentStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "20px",
  maxWidth: "320px",
  width: "100%",
  textAlign: "center",
  boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
};

const modalBtnStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: "10px",
  border: "none",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer"
};

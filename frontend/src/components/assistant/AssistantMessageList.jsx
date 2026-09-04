import React, { useEffect, useRef } from "react";
import PriceCard from "./cards/PriceCard";
import MaterialPhotoCard from "./cards/MaterialPhotoCard";
import RecyclerMatchCard from "./cards/RecyclerMatchCard";
import ConfirmationCard from "./cards/ConfirmationCard";
import EarningsCard from "./cards/EarningsCard";
import SafetyCard from "./cards/SafetyCard";

export default function AssistantMessageList({
  messages = [],
  loading = false,
  language = "hi",
  onActionClick,
  onConfirmAction,
  onCancelAction,
  onPhotoConfirm,
  onPhotoReject,
  onSellToRecycler,
  onSpeakText
}) {
  const bottomRef = useRef(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const typingText = {
    hi: "Assistant सोच रहा है...",
    mr: "Assistant विचार करत आहे...",
    en: "Assistant is thinking..."
  }[language] || "Assistant सोच रहा है...";

  return (
    <div style={containerStyle}>
      {messages.map((msg, index) => {
        const isUser = msg.sender === "user";

        return (
          <div
            key={msg.id || `${msg.sender}-${index}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isUser ? "flex-end" : "flex-start",
              marginBottom: "14px"
            }}
          >
            {/* Sender Label & Timestamp */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280" }}>
                {isUser ? "👤 Aap" : "♻️ Kabadiwala Assistant"}
              </span>
              {msg.time && (
                <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                  {msg.time}
                </span>
              )}
            </div>

            {/* Bubble */}
            <div
              style={{
                maxWidth: "88%",
                padding: "12px 14px",
                borderRadius: isUser ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                background: isUser ? "#1b7f3a" : "#ffffff",
                color: isUser ? "#ffffff" : "#111827",
                border: isUser ? "none" : "1px solid #e5e7eb",
                fontSize: "14px",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                boxShadow: isUser ? "0 2px 8px rgba(27,127,58,0.25)" : "0 2px 8px rgba(0,0,0,0.04)",
                position: "relative"
              }}
            >
              {/* If user attached image */}
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Scrap item"
                  style={{
                    width: "100%",
                    maxHeight: "180px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    marginBottom: "8px"
                  }}
                />
              )}

              {msg.text}

              {/* Speaker Replay Icon on Assistant message */}
              {!isUser && onSpeakText && msg.text && (
                <button
                  type="button"
                  onClick={() => onSpeakText(msg.text)}
                  aria-label="Play Voice"
                  title="Play Voice"
                  style={speakButtonStyle}
                >
                  🔊
                </button>
              )}
            </div>

            {/* Rich Embedded Cards */}
            {!isUser && msg.card_type === "price" && (
              <div style={{ width: "100%", maxWidth: "92%" }}>
                <PriceCard
                  data={msg.card_data}
                  language={language}
                  onAction={onActionClick}
                />
              </div>
            )}

            {!isUser && msg.card_type === "photo" && (
              <div style={{ width: "100%", maxWidth: "92%" }}>
                <MaterialPhotoCard
                  data={msg.card_data}
                  imageUrl={msg.imageUrl}
                  language={language}
                  onConfirm={onPhotoConfirm}
                  onReject={onPhotoReject}
                />
              </div>
            )}

            {!isUser && msg.card_type === "recycler_list" && (
              <div style={{ width: "100%", maxWidth: "92%" }}>
                <RecyclerMatchCard
                  data={msg.card_data}
                  language={language}
                  onSellToRecycler={onSellToRecycler}
                />
              </div>
            )}

            {!isUser && msg.card_type === "confirmation" && (
              <div style={{ width: "100%", maxWidth: "92%" }}>
                <ConfirmationCard
                  data={msg.card_data}
                  language={language}
                  onConfirm={onConfirmAction}
                  onCancel={onCancelAction}
                />
              </div>
            )}

            {!isUser && msg.card_type === "earnings" && (
              <div style={{ width: "100%", maxWidth: "92%" }}>
                <EarningsCard
                  data={msg.card_data}
                  language={language}
                  onViewTransactions={() => onActionClick && onActionClick("Show all transactions")}
                />
              </div>
            )}

            {!isUser && msg.card_type === "safety" && (
              <div style={{ width: "100%", maxWidth: "92%" }}>
                <SafetyCard
                  data={msg.card_data}
                  language={language}
                  onAction={onActionClick}
                />
              </div>
            )}

            {/* Dynamic Quick Actions attached to message */}
            {!isUser && msg.quick_actions && msg.quick_actions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px", maxWidth: "92%" }}>
                {msg.quick_actions.map((act, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onActionClick && onActionClick(act.value || act.label)}
                    style={pillButtonStyle}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Typing Indicator */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#ffffff", borderRadius: "14px", width: "fit-content", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={dotsWrapperStyle}>
            <span style={{ ...dotStyle, animationDelay: "0ms" }} />
            <span style={{ ...dotStyle, animationDelay: "180ms" }} />
            <span style={{ ...dotStyle, animationDelay: "360ms" }} />
          </div>
          <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>
            {typingText}
          </span>
        </div>
      )}

      <div ref={bottomRef} style={{ height: "4px" }} />

      <style>
        {`
          @keyframes dotPulse {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1.1); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

const containerStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "16px 14px",
  background: "#f8fafc",
  WebkitOverflowScrolling: "touch"
};

const speakButtonStyle = {
  position: "absolute",
  right: "8px",
  bottom: "-24px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "50%",
  width: "24px",
  height: "24px",
  fontSize: "11px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 2px 4px rgba(0,0,0,0.06)"
};

const pillButtonStyle = {
  background: "#ffffff",
  border: "1px solid #1b7f3a",
  color: "#1b7f3a",
  padding: "6px 12px",
  borderRadius: "14px",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s ease"
};

const dotsWrapperStyle = {
  display: "flex",
  gap: "4px",
  alignItems: "center"
};

const dotStyle = {
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  background: "#1b7f3a",
  display: "inline-block",
  animation: "dotPulse 1.2s infinite ease-in-out"
};

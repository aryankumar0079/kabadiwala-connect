import React, { useRef } from "react";
import VoiceController from "./VoiceController";

export default function AssistantComposer({
  input = "",
  onChangeInput,
  onSendMessage,
  onPhotoSelected,
  onSpeechResult,
  loading = false,
  language = "hi"
}) {
  const fileInputRef = useRef(null);

  const placeholders = {
    hi: "यहाँ अपना सवाल लिखें या बोलें...",
    mr: "येथे तुमचा प्रश्न लिहा किंवा बोला...",
    en: "Type your question or use voice..."
  }[language] || "यहाँ अपना सवाल लिखें या बोलें...";

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (input.trim() && !loading) {
        onSendMessage(input.trim());
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onPhotoSelected) {
      onPhotoSelected(file);
    }
    // reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div style={composerContainerStyle}>
      {/* Hidden file input for camera/photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", gap: "6px", alignItems: "center", width: "100%" }}>
        {/* Photo Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          aria-label="Upload Photo"
          title="Upload or Capture Photo"
          style={iconButtonStyle}
        >
          📷
        </button>

        {/* Voice Push-to-Talk */}
        <VoiceController
          language={language}
          onSpeechResult={onSpeechResult}
          isProcessing={loading}
          disabled={loading}
        />

        {/* Text Input */}
        <input
          type="text"
          value={input}
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholders}
          disabled={loading}
          style={textInputStyle}
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={() => onSendMessage(input.trim())}
          disabled={loading || !input.trim()}
          aria-label="Send Message"
          title="Send"
          style={{
            ...sendButtonStyle,
            background: loading || !input.trim() ? "#9ca3af" : "#1b7f3a",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer"
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

const composerContainerStyle = {
  padding: "10px 12px",
  background: "#ffffff",
  borderTop: "1px solid #e5e7eb",
  borderBottomLeftRadius: "18px",
  borderBottomRightRadius: "18px",
  width: "100%",
  boxSizing: "border-box"
};

const textInputStyle = {
  flex: 1,
  minWidth: 0,
  padding: "11px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  fontSize: "14px",
  outline: "none",
  color: "#111827",
  background: "#f9fafb",
  boxSizing: "border-box"
};

const iconButtonStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  border: "1px solid #e5e7eb",
  background: "#f3f4f6",
  fontSize: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0
};

const sendButtonStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  border: "none",
  color: "#ffffff",
  fontSize: "17px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "all 0.15s ease"
};

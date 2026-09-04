import React, { useState, useEffect, useRef } from "react";

export default function VoiceController({
  language = "hi",
  onSpeechResult,
  isProcessing = false,
  lastAssistantText = "",
  disabled = false
}) {
  const [voiceState, setVoiceState] = useState("idle"); // "idle" | "listening" | "processing" | "speaking" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef(null);

  // Sync processing state from parent
  useEffect(() => {
    if (isProcessing && voiceState === "listening") {
      setVoiceState("processing");
    } else if (!isProcessing && voiceState === "processing") {
      setVoiceState("idle");
    }
  }, [isProcessing, voiceState]);

  // Handle Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      // Select proper BCP-47 language tag
      if (language === "mr") {
        recognition.lang = "mr-IN";
      } else if (language === "en") {
        recognition.lang = "en-IN";
      } else {
        recognition.lang = "hi-IN";
      }

      recognition.onstart = () => {
        setVoiceState("listening");
        setErrorMessage("");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          setVoiceState("processing");
          if (onSpeechResult) {
            onSpeechResult(transcript.trim());
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage(
            language === "mr"
              ? "कृपया मायक्रोफोन परवानगी द्या."
              : language === "en"
                ? "Microphone permission required."
                : "Kripya microphone permission allow karein."
          );
        }
        setVoiceState("idle");
      };

      recognition.onend = () => {
        if (voiceState === "listening") {
          setVoiceState("idle");
        }
      };

      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [language, onSpeechResult, voiceState]);

  // Trigger push-to-talk start/stop
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(
        language === "mr"
          ? "तुमच्या ब्राउझरमध्ये व्हॉईस सपोर्ट उपलब्ध नाही."
          : language === "en"
            ? "Voice recognition is not supported on this browser."
            : "Aapke browser mein voice support nahi hai."
      );
      return;
    }

    // Stop speaking if currently playing TTS
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setVoiceState("idle");
      return;
    }

    if (voiceState === "listening") {
      recognitionRef.current.stop();
      setVoiceState("idle");
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Recognition already active:", err);
      }
    }
  };

  // Speak text helper
  const speakText = (text) => {
    if (!window.speechSynthesis || isMuted || !text) return;

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*`_~]/g, "").replace(/\n+/g, ". ");
    const utterance = new SpeechSynthesisUtterance(cleanText);

    if (language === "mr") {
      utterance.lang = "mr-IN";
    } else if (language === "en") {
      utterance.lang = "en-IN";
    } else {
      utterance.lang = "hi-IN";
    }
    utterance.rate = 0.95; // Slightly slower for low-literacy clarity

    utterance.onstart = () => setVoiceState("speaking");
    utterance.onend = () => setVoiceState("idle");
    utterance.onerror = () => setVoiceState("idle");

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceState("idle");
  };

  const labels = {
    hi: {
      idle: "बोलने के लिए दबाएं",
      listening: "🎙️ सुन रहा हूँ... (बोलिए)",
      processing: "⏳ थोड़ा रुकिएगा... (सोच रहा हूँ)",
      speaking: "🔊 बोल रहा हूँ...",
      stop: "⏹ बंद करें",
      mute: "म्यूट",
      unmute: "आवाज़ चालू",
      replay: "🔊 दोबारा सुनें"
    },
    mr: {
      idle: "बोलण्यासाठी दाबा",
      listening: "🎙️ ऐकत आहे... (बोला)",
      processing: "⏳ थोडा वेळ द्या... (विचार करत आहे)",
      speaking: "🔊 बोलत आहे...",
      stop: "⏹ थांबवा",
      mute: "म्यूट",
      unmute: "आवाज सुरू",
      replay: "🔊 पुन्हा ऐका"
    },
    en: {
      idle: "Tap to Speak",
      listening: "🎙️ Listening... (Speak now)",
      processing: "⏳ Processing...",
      speaking: "🔊 Speaking...",
      stop: "⏹ Stop",
      mute: "Mute",
      unmute: "Unmute",
      replay: "🔊 Replay Voice"
    }
  }[language] || labels?.hi;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      {/* Voice State Banner when active */}
      {voiceState !== "idle" && (
        <div style={statusBannerStyle(voiceState)}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "13px" }}>
            {voiceState === "listening" && <span style={pulseDotStyle}>🔴</span>}
            {voiceState === "speaking" && <span>🔊</span>}
            <span>{labels[voiceState]}</span>
          </div>

          {voiceState === "speaking" && (
            <button
              type="button"
              onClick={stopSpeaking}
              style={stopBtnStyle}
            >
              {labels.stop}
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div style={{ color: "#dc2626", fontSize: "11px", marginBottom: "4px" }}>
          {errorMessage}
        </div>
      )}

      {/* Push to talk button */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled || voiceState === "processing"}
        aria-label="Voice Input"
        title={labels.idle}
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: voiceState === "listening" ? "2px solid #ef4444" : "1px solid #e5e7eb",
          background: voiceState === "listening" ? "#fee2e2" : "#f3f4f6",
          color: voiceState === "listening" ? "#dc2626" : "#374151",
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          boxShadow: voiceState === "listening" ? "0 0 12px rgba(239, 68, 68, 0.4)" : "none"
        }}
      >
        {voiceState === "listening" ? "🎙️" : "🎤"}
      </button>
    </div>
  );
}

const statusBannerStyle = (state) => ({
  width: "100%",
  padding: "8px 12px",
  borderRadius: "10px",
  marginBottom: "8px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: state === "listening" ? "#fee2e2" : state === "speaking" ? "#f0fdf4" : "#f3f4f6",
  color: state === "listening" ? "#991b1b" : state === "speaking" ? "#166534" : "#374151",
  border: `1px solid ${state === "listening" ? "#fca5a5" : state === "speaking" ? "#bbf7d0" : "#e5e7eb"}`
});

const stopBtnStyle = {
  padding: "4px 8px",
  background: "#dc2626",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: 700,
  cursor: "pointer"
};

const pulseDotStyle = {
  display: "inline-block",
  animation: "pulse 1s infinite"
};

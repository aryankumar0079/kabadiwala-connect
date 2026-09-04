import React from "react";

export default function ConfirmationCard({
  data,
  language = "hi",
  onConfirm,
  onCancel,
  loading = false
}) {
  if (!data) return null;

  const { title, description, targetType, targetId, details } = data;

  const labels = {
    hi: {
      confirmHeader: "⚠️ पुष्टि करें (Confirmation Required)",
      confirmBtn: "✅ हाँ, कन्फर्म करें",
      cancelBtn: "❌ रद्द करें (Cancel)",
      note: "पुष्टि करने के बाद ही यह प्रक्रिया शुरू होगी।"
    },
    mr: {
      confirmHeader: "⚠️ पुष्टीकरण आवश्यक (Confirmation Required)",
      confirmBtn: "✅ हो, निश्चित करा",
      cancelBtn: "❌ रद्द करा (Cancel)",
      note: "पुष्टी केल्यानंतरच ही प्रक्रिया सुरू होईल."
    },
    en: {
      confirmHeader: "⚠️ Confirmation Required",
      confirmBtn: "✅ Yes, Confirm",
      cancelBtn: "❌ Cancel",
      note: "Action will execute only upon confirmation."
    }
  }[language] || labels?.hi;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "18px" }}>🔐</span>
        <strong style={{ fontSize: "14px", color: "#92400e" }}>
          {labels.confirmHeader}
        </strong>
      </div>

      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827", marginBottom: "6px" }}>
        {title || "Kya aap is action ko confirm karna chahte hain?"}
      </div>

      {description && (
        <div style={{ fontSize: "13px", color: "#4b5563", lineHeight: 1.4, marginBottom: "10px" }}>
          {description}
        </div>
      )}

      {details && (
        <div style={detailsBoxStyle}>
          {Object.entries(details).map(([key, val]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
              <span style={{ color: "#6b7280" }}>{key}:</span>
              <strong style={{ color: "#111827" }}>{val}</strong>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: "11px", color: "#6b7280", fontStyle: "italic", marginBottom: "12px" }}>
        {labels.note}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={() => onConfirm && onConfirm(targetType, targetId)}
          disabled={loading}
          style={{
            ...btnStyle,
            background: loading ? "#9ca3af" : "#1b7f3a",
            color: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "..." : labels.confirmBtn}
        </button>

        <button
          type="button"
          onClick={() => onCancel && onCancel()}
          disabled={loading}
          style={{
            ...btnStyle,
            background: "#f3f4f6",
            color: "#374151",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {labels.cancelBtn}
        </button>
      </div>
    </div>
  );
}

const containerStyle = {
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "14px",
  padding: "14px",
  marginTop: "10px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.06)"
};

const detailsBoxStyle = {
  background: "#ffffff",
  border: "1px solid #fef3c7",
  borderRadius: "8px",
  padding: "8px 10px",
  marginBottom: "10px"
};

const btnStyle = {
  flex: 1,
  padding: "10px 8px",
  border: "none",
  borderRadius: "10px",
  fontSize: "12px",
  fontWeight: 700
};

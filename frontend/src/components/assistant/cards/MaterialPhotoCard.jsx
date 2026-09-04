import React from "react";

export default function MaterialPhotoCard({
  data,
  imageUrl,
  language = "hi",
  onConfirm,
  onReject
}) {
  if (!data) return null;

  const {
    category,
    sub_category,
    condition,
    confidence = 85,
    description,
    safety_tip,
    current_market_rate,
    needs_clearer_photo
  } = data;

  const isLowConfidence = needs_clearer_photo || confidence < 70;

  const labels = {
    hi: {
      title: "📷 मटेरियल पहचान (AI Vision)",
      category: "श्रेणी",
      subCat: "प्रकार",
      condition: "स्थिति",
      confidence: "विश्वास स्तर",
      marketRate: "बाजार भाव",
      confirmQ: "क्या यह जानकारी सही है?",
      yesBtn: "✅ हाँ, सही है",
      noBtn: "❌ नहीं, गलत है",
      retakeTip: "कृपया सामग्री की और साफ व स्पष्ट फोटो भेजें।"
    },
    mr: {
      title: "📷 साहित्य ओळख (AI Vision)",
      category: "प्रवर्ग",
      subCat: "प्रकार",
      condition: "स्थिती",
      confidence: "अचूकता पातळी",
      marketRate: "बाजार भाव",
      confirmQ: "ही माहिती बरोबर आहे का?",
      yesBtn: "✅ हो, बरोबर आहे",
      noBtn: "❌ नाही, चुकीचे आहे",
      retakeTip: "कृपया साहित्याचा अधिक स्पष्ट फोटो पाठवा."
    },
    en: {
      title: "📷 Material Identified (AI Vision)",
      category: "Category",
      subCat: "Sub-category",
      condition: "Condition",
      confidence: "Confidence",
      marketRate: "Market Rate",
      confirmQ: "Is this identification correct?",
      yesBtn: "✅ Yes, Correct",
      noBtn: "❌ No, Incorrect",
      retakeTip: "Please provide a clearer, closer photograph."
    }
  }[language] || labels?.hi;

  const confColor = confidence >= 85 ? "#16a34a" : confidence >= 70 ? "#d97706" : "#dc2626";

  return (
    <div style={containerStyle}>
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>
          {labels.title}
        </div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: confColor }}>
          {confidence}% Match
        </div>
      </div>

      {/* Image Thumbnail & Summary */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "12px", alignItems: "flex-start" }}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Scrap Preview"
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "10px",
              objectFit: "cover",
              border: "1px solid #e5e7eb"
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "16px", fontWeight: 900, color: "#1b7f3a" }}>
            {sub_category || category}
          </div>
          <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "2px" }}>
            {labels.category}: <strong>{category}</strong>
          </div>
          {condition && (
            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "1px" }}>
              {labels.condition}: {condition}
            </div>
          )}
          {current_market_rate && (
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#065f46", marginTop: "4px" }}>
              💰 {current_market_rate}
            </div>
          )}
        </div>
      </div>

      {/* Confidence Bar */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#6b7280", marginBottom: "3px" }}>
          <span>{labels.confidence}</span>
          <span>{confidence}%</span>
        </div>
        <div style={{ width: "100%", height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(10, confidence))}%`,
              height: "100%",
              background: confColor,
              borderRadius: "3px",
              transition: "width 0.4s ease"
            }}
          />
        </div>
      </div>

      {/* Description / Safety Tip */}
      {description && (
        <div style={{ fontSize: "12px", color: "#374151", background: "#f9fafb", padding: "8px 10px", borderRadius: "8px", marginBottom: "8px" }}>
          {description}
        </div>
      )}

      {safety_tip && (
        <div style={{ fontSize: "11px", color: "#92400e", background: "#fef3c7", padding: "6px 8px", borderRadius: "8px", marginBottom: "10px" }}>
          🛡️ {safety_tip}
        </div>
      )}

      {/* Low Confidence Warning */}
      {isLowConfidence ? (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", padding: "8px 10px", borderRadius: "8px", fontSize: "12px", marginBottom: "8px" }}>
          ⚠️ {labels.retakeTip}
        </div>
      ) : (
        /* Confirmation Question */
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
            {labels.confirmQ}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => onConfirm && onConfirm(category, sub_category)}
              style={{ ...btnStyle, background: "#1b7f3a", color: "#ffffff" }}
            >
              {labels.yesBtn}
            </button>
            <button
              type="button"
              onClick={() => onReject && onReject()}
              style={{ ...btnStyle, background: "#f3f4f6", color: "#374151" }}
            >
              {labels.noBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "14px",
  marginTop: "10px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.06)"
};

const btnStyle = {
  flex: 1,
  padding: "9px",
  border: "none",
  borderRadius: "10px",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer"
};

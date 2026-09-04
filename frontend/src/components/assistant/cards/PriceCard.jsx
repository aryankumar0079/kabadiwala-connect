import React from "react";

export default function PriceCard({
  data,
  language = "hi",
  onAction
}) {
  if (!data || !data.price_info) return null;

  const { material, price_info, calculation } = data;
  const isFound = price_info.found;

  const loc = price_info.location || "Market";
  const rate = price_info.current_rate || price_info.buying_price;
  const bestOffer = price_info.best_recycler_offer || rate;
  const unit = price_info.unit || "kg";

  const labels = {
    hi: {
      rateTitle: "वर्तमान बाजार भाव (Market Rate)",
      bestOffer: "सर्वोत्तम रिसायकलर ऑफर (Best Offer)",
      fairEst: "अनुमानित कुल मूल्य (Total Value)",
      location: "स्थान (Location)",
      sellBtn: "📦 यह माल बेचना है",
      recyclerBtn: "🤝 नजदीकी Recycler देखें",
      noPrice: "इस सामग्री का दर उपलब्ध नहीं है"
    },
    mr: {
      rateTitle: "सध्याचा बाजार भाव (Market Rate)",
      bestOffer: "उत्कृष्ट रिसायकलर ऑफर (Best Offer)",
      fairEst: "अंदाजे एकूण किंमत (Total Value)",
      location: "ठिकाण (Location)",
      sellBtn: "📦 हा माल विकायचा आहे",
      recyclerBtn: "🤝 जवळचे Recycler पहा",
      noPrice: "या साहित्याचा दर उपलब्ध नाही"
    },
    en: {
      rateTitle: "Current Market Rate",
      bestOffer: "Best Recycler Offer",
      fairEst: "Estimated Total Value",
      location: "Location",
      sellBtn: "📦 Sell This Material",
      recyclerBtn: "🤝 Find Nearby Recyclers",
      noPrice: "Rate not available in database"
    }
  }[language] || labels?.hi;

  if (!isFound) {
    return (
      <div style={cardContainerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "20px" }}>ℹ️</span>
          <strong style={{ fontSize: "15px", color: "#374151" }}>{material}</strong>
        </div>
        <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "12px" }}>
          {labels.noPrice}
        </div>
        {onAction && (
          <button
            type="button"
            onClick={() => onAction(`Find nearby recyclers for ${material}`)}
            style={actionButtonStyle}
          >
            {labels.recyclerBtn}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={cardContainerStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827" }}>
            {material}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
            📍 {loc}
          </div>
        </div>
        <span style={badgeStyle}>
          ✓ Verified Price
        </span>
      </div>

      {/* Rates Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
        <div style={rateBoxStyle}>
          <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>
            {labels.rateTitle}
          </div>
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#1b7f3a", marginTop: "2px" }}>
            ₹{rate}
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}> /{unit}</span>
          </div>
        </div>

        <div style={{ ...rateBoxStyle, background: "#f0fdf4", borderColor: "#86efac" }}>
          <div style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
            {labels.bestOffer}
          </div>
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#15803d", marginTop: "2px" }}>
            ₹{bestOffer}
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#166534" }}> /{unit}</span>
          </div>
        </div>
      </div>

      {/* If weight calculation exists */}
      {calculation && (
        <div style={calcBoxStyle}>
          <div style={{ fontSize: "12px", color: "#374151" }}>
            📊 <strong>{calculation.weight_kg} kg</strong> @ ₹{calculation.unit_price}/{unit}
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#065f46", marginTop: "2px" }}>
            {labels.fairEst}: ₹{calculation.total_estimated}
          </div>
        </div>
      )}

      {/* Actions */}
      {onAction && (
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button
            type="button"
            onClick={() => onAction(`I want to sell ${material}`)}
            style={{ ...actionButtonStyle, background: "#1b7f3a", color: "#ffffff" }}
          >
            {labels.sellBtn}
          </button>
          <button
            type="button"
            onClick={() => onAction(`Find nearby recyclers for ${material}`)}
            style={{ ...actionButtonStyle, background: "#f3f4f6", color: "#374151" }}
          >
            {labels.recyclerBtn}
          </button>
        </div>
      )}
    </div>
  );
}

const cardContainerStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "14px",
  marginTop: "10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
};

const badgeStyle = {
  background: "#dcfce7",
  color: "#15803d",
  fontSize: "11px",
  fontWeight: 700,
  padding: "3px 8px",
  borderRadius: "12px"
};

const rateBoxStyle = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "10px"
};

const calcBoxStyle = {
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
  borderRadius: "10px",
  padding: "10px",
  marginBottom: "8px"
};

const actionButtonStyle = {
  flex: 1,
  padding: "10px 8px",
  border: "none",
  borderRadius: "10px",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.15s ease"
};

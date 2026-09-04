import React from "react";

export default function RecyclerMatchCard({
  data,
  language = "hi",
  onSellToRecycler
}) {
  if (!data || !data.recyclers || data.recyclers.length === 0) return null;

  const recyclers = data.recyclers;

  const labels = {
    hi: {
      title: "🏭 अधिकृत रिसायकलर्स (Authorized Recyclers)",
      pickup: "पिकअप उपलब्ध",
      dropOnly: "सेंटर पर ड्रॉप",
      authorized: "✓ ऑथराइज्ड",
      sellBtn: "📦 माल बेचें",
      viewBtn: "विवरण देखें"
    },
    mr: {
      title: "🏭 अधिकृत रिसायकलर्स (Authorized Recyclers)",
      pickup: "पिकअप उपलब्ध",
      dropOnly: "केंद्रावर जमा करा",
      authorized: "✓ अधिकृत",
      sellBtn: "📦 माल विका",
      viewBtn: "माहिती पहा"
    },
    en: {
      title: "🏭 Authorized Recyclers",
      pickup: "Pickup Available",
      dropOnly: "Self Drop",
      authorized: "✓ Verified",
      sellBtn: "📦 Sell Lot",
      viewBtn: "View Details"
    }
  }[language] || labels?.hi;

  return (
    <div style={{ marginTop: "10px", display: "grid", gap: "10px" }}>
      <div style={{ fontSize: "13px", fontWeight: 800, color: "#374151", paddingLeft: "4px" }}>
        {labels.title} ({recyclers.length})
      </div>

      {recyclers.map((recycler, index) => (
        <div key={recycler.recycler_id || index} style={cardStyle}>
          {/* Top line: Name and Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
            <div style={{ fontWeight: 800, fontSize: "14px", color: "#111827", flex: 1, paddingRight: "8px" }}>
              {recycler.recycler_name}
            </div>
            <span style={verifiedBadgeStyle}>
              {labels.authorized}
            </span>
          </div>

          {/* Location & Service */}
          <div style={{ fontSize: "12px", color: "#4b5563", marginBottom: "4px" }}>
            📍 {recycler.location || recycler.service_area}
            {recycler.distance_km && (
              <span style={{ color: "#1b7f3a", fontWeight: 700, marginLeft: "6px" }}>
                ({recycler.distance_km} km)
              </span>
            )}
          </div>

          {/* Pickup & Rate */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #e5e7eb" }}>
            <div style={{ fontSize: "11px", color: recycler.pickup_available ? "#166534" : "#4b5563", fontWeight: 600 }}>
              {recycler.pickup_available ? `🚚 ${labels.pickup}` : `🏢 ${labels.dropOnly}`}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 900, color: "#1b7f3a" }}>
              {recycler.offered_rate}
            </div>
          </div>

          {/* Action button */}
          {onSellToRecycler && (
            <button
              type="button"
              onClick={() => onSellToRecycler(recycler)}
              style={actionBtnStyle}
            >
              {labels.sellBtn}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
};

const verifiedBadgeStyle = {
  background: "#dcfce7",
  color: "#166534",
  fontSize: "10px",
  fontWeight: 800,
  padding: "2px 7px",
  borderRadius: "10px",
  whiteSpace: "nowrap"
};

const actionBtnStyle = {
  width: "100%",
  marginTop: "10px",
  padding: "8px",
  border: "none",
  borderRadius: "8px",
  background: "#1b7f3a",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer"
};

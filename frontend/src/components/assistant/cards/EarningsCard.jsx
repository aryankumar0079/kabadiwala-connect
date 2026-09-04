import React from "react";

export default function EarningsCard({
  data,
  language = "hi",
  onViewTransactions
}) {
  if (!data) return null;

  const {
    total_earnings = 0,
    pending_amount = 0,
    completed_transactions = 0,
    total_transactions = 0
  } = data;

  const labels = {
    hi: {
      title: "💰 कमाई और भुगतान विवरण (Earnings)",
      total: "कुल प्राप्त कमाई",
      pending: "प्रलंबित भुगतान (Pending)",
      completed: "सफल लेनदेन",
      viewBtn: "📋 सभी लेनदेन देखें"
    },
    mr: {
      title: "💰 कमाई आणि देयके (Earnings)",
      total: "एकूण मिळालेली कमाई",
      pending: "प्रलंबित रक्कम (Pending)",
      completed: "पूर्ण झालेले व्यवहार",
      viewBtn: "📋 सर्व व्यवहार पहा"
    },
    en: {
      title: "💰 Earnings & Payout Summary",
      total: "Total Realized Earnings",
      pending: "Pending Payout",
      completed: "Completed Transactions",
      viewBtn: "📋 View Transactions"
    }
  }[language] || labels?.hi;

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827", marginBottom: "10px" }}>
        {labels.title}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
        <div style={statBoxStyle}>
          <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>
            {labels.total}
          </div>
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#1b7f3a", marginTop: "2px" }}>
            ₹{total_earnings}
          </div>
        </div>

        <div style={{ ...statBoxStyle, background: "#fffbeb", borderColor: "#fde68a" }}>
          <div style={{ fontSize: "11px", color: "#92400e", fontWeight: 600 }}>
            {labels.pending}
          </div>
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#d97706", marginTop: "2px" }}>
            ₹{pending_amount}
          </div>
        </div>
      </div>

      <div style={{ fontSize: "12px", color: "#4b5563", background: "#f9fafb", padding: "8px 10px", borderRadius: "8px", marginBottom: "10px" }}>
        ✅ {labels.completed}: <strong>{completed_transactions} / {total_transactions} lots</strong>
      </div>

      {onViewTransactions && (
        <button
          type="button"
          onClick={onViewTransactions}
          style={btnStyle}
        >
          {labels.viewBtn}
        </button>
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
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
};

const statBoxStyle = {
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "10px",
  padding: "10px"
};

const btnStyle = {
  width: "100%",
  padding: "9px",
  border: "none",
  borderRadius: "8px",
  background: "#1b7f3a",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer"
};

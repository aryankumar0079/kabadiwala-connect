import React from "react";

export default function QuickActionPills({
  language = "hi",
  onSelectAction,
  showMaterialShortcuts = false,
  onSelectMaterial,
  disabled = false
}) {
  const actions = {
    hi: [
      { id: "rate", icon: "📈", label: "आज का रेट (Aaj ka Rate)", prompt: "Aaj ka rate batao" },
      { id: "material_rate", icon: "🔍", label: "मेरे मटेरियल का रेट", prompt: "Mujhe kisi specific material ka rate batao" },
      { id: "sell", icon: "📦", label: "मटेरियल बेचना है (Sell)", prompt: "Mujhe apna material bechna hai" },
      { id: "recycler", icon: "🏭", label: "Recycler ढूँढो (Find Recycler)", prompt: "Mere paas nearby authorized recycler dhundo" },
      { id: "offers", icon: "🏷️", label: "मेरे ऑफर्स (My Offers)", prompt: "Mere active offers dikhao" },
      { id: "earnings", icon: "💰", label: "कमाई देखो (Earnings)", prompt: "Meri kamai aur pending payment batao" },
      { id: "safety", icon: "🛡️", label: "सुरक्षा नियम (Safety)", prompt: "Scrap handling ke safety rules batao" },
      { id: "other", icon: "❓", label: "कुछ और पूछना है", prompt: "Mujhe application ke baare mein kuch aur poochna hai" }
    ],
    mr: [
      { id: "rate", icon: "📈", label: "आजचा दर (Today's Rate)", prompt: "Aaj ka rate batao" },
      { id: "material_rate", icon: "🔍", label: "माझ्या साहित्याचा दर", prompt: "Mujhe specific material ka rate batao" },
      { id: "sell", icon: "📦", label: "माल विकायचा आहे (Sell)", prompt: "Mala maazha material vikaycha aahe" },
      { id: "recycler", icon: "🏭", label: "Recycler शोधा (Find Recycler)", prompt: "Majhya javal authorized recycler shodha" },
      { id: "offers", icon: "🏷️", label: "माझ्या ऑफर्स (My Offers)", prompt: "Majhya offers dakhva" },
      { id: "earnings", icon: "💰", label: "कमाई पहा (Earnings)", prompt: "Majhi kamai aani payment status sanga" },
      { id: "safety", icon: "🛡️", label: "सुरक्षा नियम (Safety)", prompt: "Scrap safety rules sanga" },
      { id: "other", icon: "❓", label: "इतर काही विचारा", prompt: "Mala aankhin kahi vichaaraycha aahe" }
    ],
    en: [
      { id: "rate", icon: "📈", label: "Today's Scrap Rate", prompt: "What is today's scrap rate?" },
      { id: "material_rate", icon: "🔍", label: "Specific Material Price", prompt: "Tell me the rate of a specific material" },
      { id: "sell", icon: "📦", label: "I Want to Sell Scrap", prompt: "I want to sell my material" },
      { id: "recycler", icon: "🏭", label: "Find Nearby Recyclers", prompt: "Find authorized recyclers near me" },
      { id: "offers", icon: "🏷️", label: "View My Offers", prompt: "Show my active recycler offers" },
      { id: "earnings", icon: "💰", label: "Check Earnings", prompt: "Show my total earnings and payouts" },
      { id: "safety", icon: "🛡️", label: "Safety Guidance", prompt: "Tell me safe scrap handling practices" },
      { id: "other", icon: "❓", label: "Ask Something Else", prompt: "I have a question about the app" }
    ]
  }[language] || actions?.hi;

  const materials = [
    { key: "pcb", label: "PCB / E-Waste", icon: "💻" },
    { key: "copper", label: "Copper (तांबा)", icon: "🔌" },
    { key: "aluminium", label: "Aluminium (एल्युमिनियम)", icon: "🥫" },
    { key: "iron", label: "Iron (लोहा)", icon: "🔩" },
    { key: "cable", label: "Cables / Wires", icon: "⚡" },
    { key: "battery", label: "Battery (बैटरी)", icon: "🔋" },
    { key: "plastic", label: "Plastic (प्लास्टिक)", icon: "🧴" },
    { key: "paper", label: "Paper / Gatta (रद्दी)", icon: "📦" }
  ];

  return (
    <div style={{ marginTop: "12px", width: "100%" }}>
      {showMaterialShortcuts && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "12px", fontWeight: 800, color: "#4b5563", marginBottom: "8px" }}>
            {language === "mr" ? "साहित्य निवडा:" : language === "en" ? "Select Material:" : "Material chunein:"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {materials.map((mat) => (
              <button
                key={mat.key}
                type="button"
                onClick={() => onSelectMaterial && onSelectMaterial(mat.key, mat.label)}
                disabled={disabled}
                style={materialButtonStyle}
              >
                <span style={{ fontSize: "16px", marginRight: "6px" }}>{mat.icon}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{mat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Large Buttons */}
      <div style={{ display: "grid", gap: "8px" }}>
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            onClick={() => onSelectAction && onSelectAction(act.prompt, act.id)}
            disabled={disabled}
            style={actionButtonStyle}
          >
            <span style={{ fontSize: "18px", marginRight: "10px" }}>{act.icon}</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#1f2937", flex: 1 }}>{act.label}</span>
            <span style={{ color: "#9ca3af", fontSize: "14px" }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const actionButtonStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
  transition: "all 0.15s ease",
  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
};

const materialButtonStyle = {
  display: "flex",
  alignItems: "center",
  padding: "10px 10px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  textAlign: "left",
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

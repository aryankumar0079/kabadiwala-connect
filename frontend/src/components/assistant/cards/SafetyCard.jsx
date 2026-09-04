import React from "react";

export default function SafetyCard({
  data,
  language = "hi",
  onAction
}) {
  const isDanger = data?.is_danger ?? true;
  const topic = data?.topic || "general";

  const labels = {
    hi: {
      alertTitle: "🛡️ सुरक्षा नियम व दिशानिर्देश (Safety Guidelines)",
      dangerBadge: "महत्वपूर्ण सावधानी",
      wireTip: "तार जलाने के बजाय वायर स्ट्रिपर से प्लास्टिक छीलें। वजन और कीमत दोनों ज्यादा मिलेगी!",
      batteryTip: "बैटरी को साबुत रखें। एसिड बाहर न बहाएं और टर्मिनल पर टेप लगाएं।",
      pcbTip: "PCB पर कभी एसिड न डालें। जहरीली गैस से फेफड़ों को भारी नुकसान होता है।",
      generalTip: "स्क्रैप का काम करते समय मजबूत दस्ताने और जूते अवश्य पहनें।",
      btnLabel: "🤝 ऑथराइज्ड रीसायकलर्स देखें"
    },
    mr: {
      alertTitle: "🛡️ सुरक्षा नियम व मार्गदर्शक सूचना (Safety Guidelines)",
      dangerBadge: "महत्त्वाची खबरदारी",
      wireTip: "वायर जाळण्याऐवजी वायर स्ट्रिपरने प्लास्टिक सोला. वजन आणि भाव दोन्ही जास्त मिळतील!",
      batteryTip: "बॅटरी अखंड ठेवा. आम्ल गटारात टाकू नका आणि टर्मिनल्सवर टेप लावा.",
      pcbTip: "PCB वर कधीही ऍसिड टाकू नका. विषारी वायू आरोग्यासाठी घातक असतो.",
      generalTip: "कचरा हाताळताना नेहमी मजबूत हातमोजे आणि सुरक्षित शूज वापरा.",
      btnLabel: "🤝 अधिकृत रिसायकलर्स पहा"
    },
    en: {
      alertTitle: "🛡️ Safety Guidelines & Health Protections",
      dangerBadge: "Critical Safety Warning",
      wireTip: "Strip insulation mechanically using a wire stripper. Never burn cables — burning loses 15% copper weight!",
      batteryTip: "Keep batteries intact. Never dump battery acid and tape terminals to prevent sparks.",
      pcbTip: "Never use acid leaching on PCBs at home. Acid produces deadly respiratory gases.",
      generalTip: "Always wear heavy-duty safety gloves and footwear when handling scrap metals.",
      btnLabel: "🤝 View Authorized Recyclers"
    }
  }[language] || labels?.hi;

  let tipText = labels.generalTip;
  if (topic === "cable_burning") tipText = labels.wireTip;
  if (topic === "battery_safety") tipText = labels.batteryTip;
  if (topic === "pcb_acid") tipText = labels.pcbTip;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <strong style={{ fontSize: "14px", color: "#991b1b" }}>
          {labels.alertTitle}
        </strong>
        <span style={badgeStyle}>
          {labels.dangerBadge}
        </span>
      </div>

      <div style={{ fontSize: "13px", color: "#7f1d1d", lineHeight: 1.5, background: "#fee2e2", padding: "10px", borderRadius: "8px", marginBottom: "10px" }}>
        ⚠️ {tipText}
      </div>

      {onAction && (
        <button
          type="button"
          onClick={() => onAction("Show authorized recyclers")}
          style={btnStyle}
        >
          {labels.btnLabel}
        </button>
      )}
    </div>
  );
}

const containerStyle = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "14px",
  padding: "14px",
  marginTop: "10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
};

const badgeStyle = {
  background: "#dc2626",
  color: "#ffffff",
  fontSize: "10px",
  fontWeight: 800,
  padding: "2px 7px",
  borderRadius: "10px"
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

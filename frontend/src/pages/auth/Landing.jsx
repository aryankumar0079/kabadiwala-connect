import { Link } from "react-router-dom";

function Landing() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "50px",
          boxShadow: "0 12px 35px rgba(0, 0, 0, 0.08)",
          textAlign: "center"
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 20px",
            borderRadius: "20px",
            background: "#1b7f3a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            fontWeight: 700
          }}
        >
          K
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "42px",
            lineHeight: 1.15
          }}
        >
          Kabadiwala Connect
        </h1>

        <p
          style={{
            marginTop: "16px",
            fontSize: "18px",
            color: "#666",
            maxWidth: "650px",
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6
          }}
        >
          Connect collectors with recyclers, discover fair
          prices, and make scrap selling easier and more
          transparent.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "14px",
            flexWrap: "wrap",
            marginTop: "32px"
          }}
        >
          <Link
            to="/login"
            style={{
              textDecoration: "none",
              padding: "13px 28px",
              borderRadius: "10px",
              background: "#1b7f3a",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "16px"
            }}
          >
            Login
          </Link>

          <Link
            to="/signup"
            style={{
              textDecoration: "none",
              padding: "13px 28px",
              borderRadius: "10px",
              border: "1px solid #1b7f3a",
              background: "#ffffff",
              color: "#1b7f3a",
              fontWeight: 600,
              fontSize: "16px"
            }}
          >
            Create Account
          </Link>
        </div>

        <div
          style={{
            marginTop: "45px",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px"
          }}
        >
          <Feature
            title="Fair Pricing"
            description="Get better visibility into current scrap prices."
          />

          <Feature
            title="Recycler Connection"
            description="Find suitable recyclers near your location."
          />

          <Feature
            title="Traceable Handover"
            description="Keep material transactions documented."
          />
        </div>
      </div>
    </div>
  );
}

function Feature({ title, description }) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "14px",
        background: "#f8faf8",
        border: "1px solid #e4e9e5"
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: "8px"
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#666",
          fontSize: "14px",
          lineHeight: 1.5
        }}
      >
        {description}
      </p>
    </div>
  );
}

export default Landing;
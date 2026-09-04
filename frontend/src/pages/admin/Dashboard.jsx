import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] = useState(
    "dashboard"
  );

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "📊"
    },
    {
      id: "collectors",
      label: "Collectors",
      icon: "👤"
    },
    {
      id: "recyclers",
      label: "Recyclers",
      icon: "♻️"
    },
    {
      id: "verification",
      label: "Recycler Verification",
      icon: "✅"
    },
    {
      id: "authorization",
      label: "Authorization Review",
      icon: "📄"
    },
    {
      id: "materials",
      label: "Materials",
      icon: "📦"
    },
    {
      id: "prices",
      label: "Prices",
      icon: "💰"
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: "💳"
    },
    {
      id: "traceability",
      label: "Traceability",
      icon: "🔎"
    },
    {
      id: "dataset",
      label: "Dataset",
      icon: "🗂️"
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "📈"
    },
    {
      id: "reports",
      label: "Reports",
      icon: "📋"
    }
  ];

  const stats = [
    {
      title: "Total Collectors",
      value: "0",
      description: "Registered collectors",
      icon: "👤"
    },
    {
      title: "Total Recyclers",
      value: "0",
      description: "Registered recyclers",
      icon: "♻️"
    },
    {
      title: "Pending Verification",
      value: "0",
      description: "Need admin review",
      icon: "⏳"
    },
    {
      title: "Transactions",
      value: "0",
      description: "Completed transactions",
      icon: "💳"
    }
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7f6",
        display: "flex"
      }}
    >
      {/* ==============================
          SIDEBAR
         ============================== */}

      <aside
        style={{
          width: "250px",
          minHeight: "100vh",
          background: "#ffffff",
          borderRight: "1px solid #e5e7e5",
          padding: "24px 16px",
          boxSizing: "border-box",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflowY: "auto"
        }}
      >
        <div
          style={{
            padding: "4px 10px 24px",
            borderBottom: "1px solid #eeeeee"
          }}
        >
          <div
            style={{
              fontSize: "23px",
              fontWeight: 700,
              color: "#1b7f3a"
            }}
          >
            Kabadiwala Connect
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "13px",
              color: "#777"
            }}
          >
            Administration Panel
          </div>
        </div>

        <nav
          style={{
            marginTop: "20px"
          }}
        >
          {menuItems.map((item) => {
            const isActive =
              activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setActiveSection(item.id)
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 13px",
                  marginBottom: "5px",
                  cursor: "pointer",
                  textAlign: "left",
                  background: isActive
                    ? "#eaf5ed"
                    : "transparent",
                  color: isActive
                    ? "#1b7f3a"
                    : "#444",
                  fontWeight: isActive
                    ? 600
                    : 500,
                  fontSize: "14px"
                }}
              >
                <span
                  style={{
                    width: "24px",
                    textAlign: "center"
                  }}
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: "calc(100% - 20px)",
            position: "absolute",
            bottom: "20px",
            left: "10px",
            border: "1px solid #f0d3d3",
            borderRadius: "10px",
            padding: "11px",
            background: "#fff7f7",
            color: "#c62828",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </aside>

      {/* ==============================
          MAIN CONTENT
         ============================== */}

      <main
        style={{
          marginLeft: "250px",
          width: "calc(100% - 250px)",
          minHeight: "100vh"
        }}
      >
        {/* Header */}

        <header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e5e7e5",
            padding: "20px 30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px"
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "26px"
              }}
            >
              {getSectionTitle(activeSection)}
            </h1>

            <p
              style={{
                margin: "5px 0 0",
                color: "#777",
                fontSize: "14px"
              }}
            >
              Manage Kabadiwala Connect platform
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#eaf5ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px"
              }}
            >
              👨‍💼
            </div>

            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "14px"
                }}
              >
                Admin
              </div>

              <div
                style={{
                  color: "#777",
                  fontSize: "12px"
                }}
              >
                {user?.role || "admin"}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}

        <section
          style={{
            padding: "30px"
          }}
        >
          {activeSection === "dashboard" ? (
            <DashboardHome stats={stats} />
          ) : (
            <ComingSoonSection
              title={getSectionTitle(activeSection)}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function DashboardHome({ stats }) {
  return (
    <>
      {/* Welcome */}

      <div
        style={{
          background: "#1b7f3a",
          color: "#ffffff",
          borderRadius: "18px",
          padding: "28px",
          marginBottom: "25px"
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "24px"
          }}
        >
          Welcome, Admin 👋
        </h2>

        <p
          style={{
            margin: "9px 0 0",
            opacity: 0.9,
            lineHeight: 1.5
          }}
        >
          Monitor collectors, recyclers, material
          transactions and the overall recycling
          ecosystem from one place.
        </p>
      </div>

      {/* Stats */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "18px",
          marginBottom: "25px"
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.title}
            style={{
              background: "#ffffff",
              borderRadius: "15px",
              padding: "20px",
              border: "1px solid #e6e9e7"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span
                style={{
                  fontSize: "24px"
                }}
              >
                {stat.icon}
              </span>

              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 700
                }}
              >
                {stat.value}
              </span>
            </div>

            <h3
              style={{
                margin: "15px 0 5px",
                fontSize: "16px"
              }}
            >
              {stat.title}
            </h3>

            <p
              style={{
                margin: 0,
                color: "#777",
                fontSize: "13px"
              }}
            >
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      {/* Management Cards */}

      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e6e9e7",
          padding: "24px"
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "20px"
          }}
        >
          Platform Management
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "15px"
          }}
        >
          <ManagementCard
            title="Recycler Verification"
            description="Review and verify recycler accounts."
            icon="✅"
          />

          <ManagementCard
            title="Authorization Review"
            description="Review submitted authorization documents."
            icon="📄"
          />

          <ManagementCard
            title="Price Management"
            description="Manage material prices and market data."
            icon="💰"
          />

          <ManagementCard
            title="Traceability"
            description="Track material movement and transactions."
            icon="🔎"
          />
        </div>
      </div>
    </>
  );
}

function ManagementCard({
  title,
  description,
  icon
}) {
  return (
    <div
      style={{
        padding: "18px",
        background: "#f8faf8",
        borderRadius: "12px",
        border: "1px solid #e5eae6"
      }}
    >
      <div
        style={{
          fontSize: "25px",
          marginBottom: "10px"
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          margin: "0 0 7px",
          fontSize: "16px"
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#777",
          fontSize: "13px",
          lineHeight: 1.5
        }}
      >
        {description}
      </p>
    </div>
  );
}

function ComingSoonSection({ title }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e6e9e7",
        padding: "35px",
        textAlign: "center"
      }}
    >
      <div
        style={{
          fontSize: "45px",
          marginBottom: "15px"
        }}
      >
        🚧
      </div>

      <h2
        style={{
          margin: 0
        }}
      >
        {title}
      </h2>

      <p
        style={{
          color: "#777",
          marginTop: "10px"
        }}
      >
        This module will be connected with the backend
        APIs in the next development phase.
      </p>
    </div>
  );
}

function getSectionTitle(section) {
  const titles = {
    dashboard: "Admin Dashboard",
    collectors: "Collectors",
    recyclers: "Recyclers",
    verification: "Recycler Verification",
    authorization: "Authorization Review",
    materials: "Materials",
    prices: "Prices",
    transactions: "Transactions",
    traceability: "Traceability",
    dataset: "Dataset",
    analytics: "Analytics",
    reports: "Reports"
  };

  return titles[section] || "Admin Dashboard";
}

export default Dashboard;
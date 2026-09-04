import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";

function Login() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!identifier.trim()) {
      setError("Please enter your mobile number or email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const data = await login(
        identifier.trim(),
        password
      );

      /*
       * Login successful.
       * User ko uske role ke dashboard par bhejo.
       */

      if (data.role === "collector") {
        navigate("/collector/dashboard", {
          replace: true
        });
      } else if (data.role === "recycler") {
        navigate("/recycler/dashboard", {
          replace: true
        });
      } else if (data.role === "admin") {
        navigate("/admin/dashboard", {
          replace: true
        });
      } else {
        setError("Unknown user role.");
      }
    } catch (err) {
      setError(
        err.message ||
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f7f5",
        padding: "24px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)"
        }}
      >
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              fontWeight: 700
            }}
          >
            Welcome Back
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#666",
              fontSize: "15px"
            }}
          >
            Login to Kabadiwala Connect
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          <div style={{ marginBottom: "18px" }}>
            <label
              htmlFor="identifier"
              style={{
                display: "block",
                marginBottom: "7px",
                fontWeight: 600
              }}
            >
              Mobile Number or Email
            </label>

            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(event) =>
                setIdentifier(event.target.value)
              }
              placeholder="Enter mobile or email"
              autoComplete="username"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                border: "1px solid #d7d7d7",
                borderRadius: "10px",
                outline: "none",
                fontSize: "15px"
              }}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: "7px",
                fontWeight: 600
              }}
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter password"
              autoComplete="current-password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 14px",
                border: "1px solid #d7d7d7",
                borderRadius: "10px",
                outline: "none",
                fontSize: "15px"
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: "18px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#fff0f0",
                color: "#c62828",
                fontSize: "14px"
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "10px",
              padding: "13px",
              background: loading
                ? "#9e9e9e"
                : "#1b7f3a",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 600,
              cursor: loading
                ? "not-allowed"
                : "pointer"
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "14px"
          }}
        >
          <span style={{ color: "#666" }}>
            Don't have an account?{" "}
          </span>

          <Link
            to="/signup"
            style={{
              color: "#1b7f3a",
              fontWeight: 600,
              textDecoration: "none"
            }}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
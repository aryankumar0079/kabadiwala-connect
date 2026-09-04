import { useState } from "react";
import { Link } from "react-router-dom";

function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    setError(
      "Password reset is not available yet. The backend OTP and password reset service needs to be added first."
    );
  }

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
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)"
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "30px"
          }}
        >
          Forgot Password
        </h1>

        <p
          style={{
            marginTop: "10px",
            color: "#666",
            lineHeight: 1.5
          }}
        >
          Enter your registered mobile number or email
          address to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="identifier"
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600
            }}
          >
            Mobile Number or Email
          </label>

          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value);
              setError("");
            }}
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

          {error && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#fff0f0",
                color: "#c62828",
                fontSize: "14px",
                lineHeight: 1.5
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              marginTop: "18px",
              border: "none",
              borderRadius: "10px",
              padding: "13px",
              background: "#1b7f3a",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Continue
          </button>
        </form>

        <div
          style={{
            marginTop: "20px",
            textAlign: "center"
          }}
        >
          <Link
            to="/login"
            style={{
              color: "#1b7f3a",
              textDecoration: "none",
              fontWeight: 600
            }}
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
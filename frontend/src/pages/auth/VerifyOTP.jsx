import { useState } from "react";
import { Link } from "react-router-dom";

function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    setError(
      "OTP verification is not available yet. The backend OTP service needs to be added first."
    );
  }

  function handleOtpChange(event) {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(value);
    setError("");
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
          Verify OTP
        </h1>

        <p
          style={{
            color: "#666",
            lineHeight: 1.5,
            marginTop: "10px"
          }}
        >
          Enter the 6-digit OTP sent to your registered
          mobile number.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="otp"
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600
            }}
          >
            OTP
          </label>

          <input
            id="otp"
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={handleOtpChange}
            placeholder="Enter 6-digit OTP"
            maxLength={6}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              border: "1px solid #d7d7d7",
              borderRadius: "10px",
              fontSize: "20px",
              letterSpacing: "6px",
              textAlign: "center",
              outline: "none"
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
            Verify OTP
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

export default VerifyOTP;
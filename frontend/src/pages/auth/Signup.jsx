import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signupUser } from "../../services/authService";

function Signup() {
  const navigate = useNavigate();

  const [role, setRole] = useState("collector");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    facility_name: "",
    facility_location: "",
    registration_number: "",
    authorization_type: "",
    service_area: "",
    pickup_available: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function handleRoleChange(event) {
    setRole(event.target.value);

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!formData.mobile.trim()) {
      setError("Please enter your mobile number.");
      return;
    }

    if (!formData.password) {
      setError("Please enter a password.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (role === "recycler") {
      if (!formData.facility_name.trim()) {
        setError("Facility name is required.");
        return;
      }

      if (!formData.facility_location.trim()) {
        setError("Facility location is required.");
        return;
      }

      if (!formData.registration_number.trim()) {
        setError("Registration number is required.");
        return;
      }

      if (!formData.authorization_type.trim()) {
        setError("Authorization type is required.");
        return;
      }
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      mobile: formData.mobile.trim(),
      password: formData.password,
      role
    };

    if (role === "recycler") {
      payload.facility_name =
        formData.facility_name.trim();

      payload.facility_location =
        formData.facility_location.trim();

      payload.registration_number =
        formData.registration_number.trim();

      payload.authorization_type =
        formData.authorization_type.trim();

      payload.service_area =
        formData.service_area.trim() || null;

      payload.pickup_available =
        Boolean(formData.pickup_available);
    }

    try {
      setLoading(true);

      const data = await signupUser(payload);

      setSuccess(
        data.message ||
        "Signup successful."
      );

      /*
       * Signup ke baad login page par bhejenge.
       * Automatically login nahi karenge.
       */
      setTimeout(() => {
        navigate("/login", {
          replace: true
        });
      }, 1200);
    } catch (err) {
      setError(
        err.message ||
        "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7f5",
        display: "flex",
        justifyContent: "center",
        padding: "32px 20px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "32px",
          boxShadow:
            "0 10px 30px rgba(0, 0, 0, 0.08)"
        }}
      >
        <div style={{ marginBottom: "26px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "30px"
            }}
          >
            Create Account
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#666"
            }}
          >
            Join Kabadiwala Connect
          </p>
        </div>

        {/* Role Selection */}
        <div style={{ marginBottom: "22px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600
            }}
          >
            Account Type
          </label>

          <div
            style={{
              display: "flex",
              gap: "12px"
            }}
          >
            <label
              style={{
                flex: 1,
                border: role === "collector"
                  ? "2px solid #1b7f3a"
                  : "1px solid #d7d7d7",
                borderRadius: "10px",
                padding: "12px",
                cursor: "pointer"
              }}
            >
              <input
                type="radio"
                name="role"
                value="collector"
                checked={role === "collector"}
                onChange={handleRoleChange}
              />{" "}
              Collector
            </label>

            <label
              style={{
                flex: 1,
                border: role === "recycler"
                  ? "2px solid #1b7f3a"
                  : "1px solid #d7d7d7",
                borderRadius: "10px",
                padding: "12px",
                cursor: "pointer"
              }}
            >
              <input
                type="radio"
                name="role"
                value="recycler"
                checked={role === "recycler"}
                onChange={handleRoleChange}
              />{" "}
              Recycler
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Name */}
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="name"
              style={{
                display: "block",
                marginBottom: "7px",
                fontWeight: 600
              }}
            >
              Full Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              autoComplete="name"
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: "7px",
                fontWeight: 600
              }}
            >
              Email
              <span
                style={{
                  color: "#888",
                  fontWeight: 400
                }}
              >
                {" "} (Optional)
              </span>
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          {/* Mobile */}
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="mobile"
              style={{
                display: "block",
                marginBottom: "7px",
                fontWeight: 600
              }}
            >
              Mobile Number
            </label>

            <input
              id="mobile"
              name="mobile"
              type="tel"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Enter mobile number"
              autoComplete="tel"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "20px" }}>
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
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              style={inputStyle}
            />
          </div>

          {/* Recycler Fields */}
          {role === "recycler" && (
            <div
              style={{
                marginTop: "8px",
                marginBottom: "22px",
                padding: "18px",
                background: "#f8faf8",
                borderRadius: "12px",
                border: "1px solid #e1e7e2"
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "18px"
                }}
              >
                Recycler Details
              </h3>

              {/* Facility Name */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="facility_name"
                  style={labelStyle}
                >
                  Facility Name
                </label>

                <input
                  id="facility_name"
                  name="facility_name"
                  type="text"
                  value={formData.facility_name}
                  onChange={handleChange}
                  placeholder="Enter facility name"
                  style={inputStyle}
                />
              </div>

              {/* Facility Location */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="facility_location"
                  style={labelStyle}
                >
                  Facility Location
                </label>

                <input
                  id="facility_location"
                  name="facility_location"
                  type="text"
                  value={formData.facility_location}
                  onChange={handleChange}
                  placeholder="Enter facility location"
                  style={inputStyle}
                />
              </div>

              {/* Registration Number */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="registration_number"
                  style={labelStyle}
                >
                  Registration Number
                </label>

                <input
                  id="registration_number"
                  name="registration_number"
                  type="text"
                  value={formData.registration_number}
                  onChange={handleChange}
                  placeholder="Enter registration number"
                  style={inputStyle}
                />
              </div>

              {/* Authorization Type */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="authorization_type"
                  style={labelStyle}
                >
                  Authorization Type
                </label>

                <input
                  id="authorization_type"
                  name="authorization_type"
                  type="text"
                  value={formData.authorization_type}
                  onChange={handleChange}
                  placeholder="Example: CPCB Authorization"
                  style={inputStyle}
                />
              </div>

              {/* Service Area */}
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="service_area"
                  style={labelStyle}
                >
                  Service Area
                  <span
                    style={{
                      color: "#888",
                      fontWeight: 400
                    }}
                  >
                    {" "} (Optional)
                  </span>
                </label>

                <input
                  id="service_area"
                  name="service_area"
                  type="text"
                  value={formData.service_area}
                  onChange={handleChange}
                  placeholder="Example: Delhi NCR"
                  style={inputStyle}
                />
              </div>

              {/* Pickup */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  cursor: "pointer"
                }}
              >
                <input
                  name="pickup_available"
                  type="checkbox"
                  checked={
                    formData.pickup_available
                  }
                  onChange={handleChange}
                />

                Pickup available
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: "16px",
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

          {/* Success */}
          {success && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#eef9f1",
                color: "#1b7f3a",
                fontSize: "14px"
              }}
            >
              {success}
            </div>
          )}

          {/* Submit */}
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
            {loading
              ? "Creating Account..."
              : "Create Account"}
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
            Already have an account?{" "}
          </span>

          <Link
            to="/login"
            style={{
              color: "#1b7f3a",
              fontWeight: 600,
              textDecoration: "none"
            }}
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  border: "1px solid #d7d7d7",
  borderRadius: "10px",
  outline: "none",
  fontSize: "15px"
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontWeight: 600
};

export default Signup;
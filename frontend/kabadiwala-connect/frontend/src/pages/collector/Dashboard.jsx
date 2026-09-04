import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getCollectorProfile,
  detectAndSaveCollectorLocation
} from "../../services/collectorService";


// ======================================================
// COLLECTOR DASHBOARD
// ======================================================

function Dashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  const [location, setLocation] = useState(null);

  const [locationLoading, setLocationLoading] =
    useState(true);

  const [locationError, setLocationError] =
    useState("");

  const [locationMessage, setLocationMessage] =
    useState("");

  const [profileLoading, setProfileLoading] =
    useState(true);

  const [profileError, setProfileError] =
    useState("");


  // ====================================================
  // LOAD COLLECTOR PROFILE
  // ====================================================

  async function loadProfile() {
    try {
      setProfileLoading(true);
      setProfileError("");

      const data =
        await getCollectorProfile();

      setProfile(data);

      // ------------------------------------------------
      // Existing saved location
      // ------------------------------------------------

      if (
        data.latitude !== null &&
        data.latitude !== undefined &&
        data.longitude !== null &&
        data.longitude !== undefined
      ) {
        setLocation(
          (previous) => ({
            ...previous,

            latitude:
              data.latitude,

            longitude:
              data.longitude,

            accuracy:
              previous?.accuracy ?? null,

            address:
              previous?.address ?? null,

            city:
              previous?.city ?? null,

            district:
              previous?.district ?? null,

            state:
              previous?.state ?? null,

            postcode:
              previous?.postcode ?? null,

            country:
              previous?.country ?? null
          })
        );
      }

    } catch (err) {

      setProfileError(
        err.message ||
        "Unable to load collector profile."
      );

    } finally {

      setProfileLoading(false);

    }
  }


  // ====================================================
  // DETECT + SAVE + RESOLVE CURRENT LOCATION
  // ====================================================

  async function detectCurrentLocation() {

    try {

      setLocationLoading(true);

      setLocationError("");

      setLocationMessage("");


      // ------------------------------------------------
      // Browser GPS
      // Backend save
      // Geoapify reverse geocoding
      // ------------------------------------------------

      const locationData =
        await detectAndSaveCollectorLocation();


      // ------------------------------------------------
      // Store complete location
      // ------------------------------------------------

      setLocation(
        locationData
      );


      // ------------------------------------------------
      // Success message
      // ------------------------------------------------

      setLocationMessage(
        "Current location detected, saved and resolved successfully."
      );


      // ------------------------------------------------
      // Refresh collector profile
      // ------------------------------------------------

      await loadProfile();

    } catch (err) {

      setLocationError(
        err.message ||
        "Unable to detect and save current location."
      );

    } finally {

      setLocationLoading(false);

    }
  }


  // ====================================================
  // PAGE INITIALIZATION
  // ====================================================

  useEffect(() => {

    async function initializeDashboard() {

      // ------------------------------------------------
      // Load profile first
      // ------------------------------------------------

      await loadProfile();


      // ------------------------------------------------
      // Automatically detect current location
      // when dashboard opens
      // ------------------------------------------------

      await detectCurrentLocation();

    }

    initializeDashboard();

  }, []);


  // ====================================================
  // OPEN CREATE LOT
  // ====================================================

  function handleCreateLot() {

    navigate(
      "/collector/create-lot"
    );

  }


  // ====================================================
  // RENDER
  // ====================================================

  return (

    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7f5",
        padding: "30px",
        boxSizing: "border-box"
      }}
    >

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto"
        }}
      >


        {/* =================================================
            HEADER
           ================================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "20px 24px",
            border: "1px solid #e5e9e6",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap"
          }}
        >

          <div>

            <h1
              style={{
                margin: 0,
                color: "#1b7f3a"
              }}
            >
              Collector Dashboard
            </h1>

            <p
              style={{
                margin: "7px 0 0",
                color: "#777"
              }}
            >
              Kabadiwala Connect
            </p>

          </div>


          <button
            type="button"
            onClick={handleCreateLot}
            style={{
              border: "none",
              borderRadius: "9px",
              padding: "11px 18px",
              background: "#1b7f3a",
              color: "#ffffff",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Create Material Lot
          </button>

        </div>


        {/* =================================================
            PROFILE
           ================================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #e5e9e6",
            marginBottom: "24px"
          }}
        >

          <h2
            style={{
              marginTop: 0
            }}
          >
            Collector Profile
          </h2>


          {profileLoading ? (

            <p
              style={{
                color: "#777"
              }}
            >
              Loading profile...
            </p>

          ) : profileError ? (

            <div
              style={{
                background: "#fff0f0",
                color: "#c62828",
                padding: "12px",
                borderRadius: "9px"
              }}
            >
              ❌ {profileError}
            </div>

          ) : profile ? (

            <div>

              <InfoRow
                label="Name"
                value={
                  profile.name ||
                  "N/A"
                }
              />

              <InfoRow
                label="Email"
                value={
                  profile.email ||
                  "N/A"
                }
              />

              <InfoRow
                label="Mobile"
                value={
                  profile.mobile ||
                  "N/A"
                }
              />

              <InfoRow
                label="Role"
                value={
                  profile.role ||
                  "collector"
                }
              />

            </div>

          ) : (

            <p
              style={{
                color: "#777"
              }}
            >
              Collector profile not available.
            </p>

          )}

        </div>


        {/* =================================================
            CURRENT LOCATION
           ================================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #e5e9e6",
            marginBottom: "24px"
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap"
            }}
          >

            <div>

              <h2
                style={{
                  margin: 0
                }}
              >
                Current Location
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#777"
                }}
              >
                Your current location is detected
                automatically when this page opens.
              </p>

            </div>


            <button
              type="button"
              onClick={
                detectCurrentLocation
              }
              disabled={
                locationLoading
              }
              style={{
                border: "none",
                borderRadius: "9px",
                padding: "10px 16px",
                background:
                  locationLoading
                    ? "#b7bdb9"
                    : "#1b7f3a",
                color: "#ffffff",
                fontWeight: 600,
                cursor:
                  locationLoading
                    ? "not-allowed"
                    : "pointer"
              }}
            >
              {locationLoading
                ? "Detecting..."
                : "Refresh Location"}
            </button>

          </div>


          {/* =================================================
              SUCCESS MESSAGE
             ================================================= */}

          {locationMessage && (

            <div
              style={{
                marginTop: "18px",
                background: "#eef9f1",
                color: "#1b7f3a",
                padding: "13px 15px",
                borderRadius: "10px"
              }}
            >
              ✅ {locationMessage}
            </div>

          )}


          {/* =================================================
              ERROR MESSAGE
             ================================================= */}

          {locationError && (

            <div
              style={{
                marginTop: "18px",
                background: "#fff0f0",
                color: "#c62828",
                padding: "13px 15px",
                borderRadius: "10px"
              }}
            >
              ❌ {locationError}
            </div>

          )}


          {/* =================================================
              LOCATION DATA
             ================================================= */}

          {location && (

            <div
              style={{
                marginTop: "20px",
                background: "#f8faf8",
                border:
                  "1px solid #e5e9e6",
                borderRadius: "12px",
                padding: "18px"
              }}
            >

              <h3
                style={{
                  marginTop: 0
                }}
              >
                Location Details
              </h3>


              <InfoRow
                label="Latitude"
                value={
                  location.latitude
                }
              />


              <InfoRow
                label="Longitude"
                value={
                  location.longitude
                }
              />


              <InfoRow
                label="Accuracy"
                value={
                  location.accuracy !==
                    null &&
                  location.accuracy !==
                    undefined
                    ? `${Math.round(
                        location.accuracy
                      )} meters`
                    : "N/A"
                }
              />


              <InfoRow
                label="Address"
                value={
                  location.address ||
                  "Not available"
                }
              />


              <InfoRow
                label="City"
                value={
                  location.city ||
                  "Not available"
                }
              />


              <InfoRow
                label="District"
                value={
                  location.district ||
                  "Not available"
                }
              />


              <InfoRow
                label="State"
                value={
                  location.state ||
                  "Not available"
                }
              />


              <InfoRow
                label="Postcode"
                value={
                  location.postcode ||
                  "Not available"
                }
              />


              <InfoRow
                label="Country"
                value={
                  location.country ||
                  "Not available"
                }
              />

            </div>

          )}


          {!locationLoading &&
            !location &&
            !locationError && (

              <div
                style={{
                  marginTop: "18px",
                  background: "#f8faf8",
                  padding: "15px",
                  borderRadius: "10px",
                  color: "#777"
                }}
              >
                Location not available yet.
              </div>

            )}

        </div>


        {/* =================================================
            LOCATION STATUS
           ================================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #e5e9e6"
          }}
        >

          <h2
            style={{
              marginTop: 0
            }}
          >
            Location Status
          </h2>


          {location ? (

            <p
              style={{
                margin: 0,
                color: "#1b7f3a",
                fontWeight: 600
              }}
            >
              ✅ Collector location is available
              and synchronized.
            </p>

          ) : locationLoading ? (

            <p
              style={{
                margin: 0,
                color: "#777"
              }}
            >
              Detecting current location...
            </p>

          ) : (

            <p
              style={{
                margin: 0,
                color: "#c62828"
              }}
            >
              ⚠️ Collector location is not
              available. Please allow browser
              location permission.
            </p>

          )}

        </div>

      </div>

    </div>

  );
}


// ==========================================================
// INFO ROW
// ==========================================================

function InfoRow({
  label,
  value
}) {

  return (

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "15px",
        padding: "8px 0",
        fontSize: "14px"
      }}
    >

      <span
        style={{
          color: "#777"
        }}
      >
        {label}
      </span>


      <strong
        style={{
          textAlign: "right",
          wordBreak: "break-word",
          maxWidth: "70%"
        }}
      >
        {value}
      </strong>

    </div>

  );
}


export default Dashboard;
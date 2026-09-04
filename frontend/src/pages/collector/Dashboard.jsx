import { useEffect, useState } from "react";

import { updateCollectorLocation } from "../../services/collectorService";
import { getNearbyRecyclers } from "../../services/recyclerService";
import KabadiwalaAssistant from "../../components/assistant/KabadiwalaAssistant";


function Dashboard() {
  // ==================================================
  // LOCATION
  // ==================================================

  const [location, setLocation] = useState(null);

  const [loading, setLoading] = useState(false);

  const [saved, setSaved] = useState(false);

  const [error, setError] = useState("");


  // ==================================================
  // RECYCLERS
  // ==================================================

  const [recyclers, setRecyclers] = useState([]);

  const [loadingRecyclers, setLoadingRecyclers] =
    useState(false);





  // ==================================================
  // GET CURRENT LOCATION
  // ==================================================

  const getCurrentLocation = () => {
    return new Promise(
      (resolve, reject) => {

        if (!navigator.geolocation) {
          reject(
            new Error(
              "GPS is not supported by this browser."
            )
          );

          return;
        }


        navigator.geolocation.getCurrentPosition(

          async (position) => {

            const latitude =
              position.coords.latitude;

            const longitude =
              position.coords.longitude;


            const newLocation = {
              latitude,
              longitude
            };


            setLocation(newLocation);


            try {

              await updateCollectorLocation(
                latitude,
                longitude
              );

              setSaved(true);

            } catch (locationError) {

              console.error(
                "Location save error:",
                locationError
              );

            }


            resolve(newLocation);
          },


          (geoError) => {

            reject(geoError);

          },


          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      }
    );
  };


  // ==================================================
  // LOAD NEARBY RECYCLERS
  // ==================================================

  const loadNearbyRecyclers =
    async () => {

      setLoadingRecyclers(true);

      try {

        const data =
          await getNearbyRecyclers();


        if (Array.isArray(data)) {

          setRecyclers(data);

        } else if (
          Array.isArray(data?.recyclers)
        ) {

          setRecyclers(
            data.recyclers
          );

        } else {

          setRecyclers([]);

        }

      } catch (recyclerError) {

        console.error(
          "Recycler lookup failed:",
          recyclerError
        );

      } finally {

        setLoadingRecyclers(false);
      }
    };


  // ==================================================
  // GET MY LOCATION
  // ==================================================

  const getMyLocation =
    async () => {

      if (loading) {
        return;
      }


      setLoading(true);

      setError("");

      setSaved(false);


      try {

        await getCurrentLocation();

        await loadNearbyRecyclers();

      } catch (geoError) {

        if (geoError.code === 1) {

          setError(
            "Location permission denied. Please allow location access."
          );

        } else if (geoError.code === 2) {

          setError(
            "Location information is unavailable."
          );

        } else if (geoError.code === 3) {

          setError(
            "Location request timed out."
          );

        } else {

          setError(
            geoError.message ||
            "Unable to get your location."
          );
        }

      } finally {

        setLoading(false);
      }
    };


  // ==================================================
  // LOAD LOCATION ON PAGE START
  // ==================================================

  useEffect(() => {

    getMyLocation();

  }, []);


  // ==================================================
  // UI
  // ==================================================

  return (

    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "20px",
        boxSizing: "border-box"
      }}
    >

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto"
        }}
      >

        {/* ============================================
            HEADER
           ============================================ */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "22px",
            marginBottom: "18px",
            boxShadow:
              "0 4px 16px rgba(0,0,0,0.06)",

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
                fontSize: "28px"
              }}
            >
              ♻️ Kabadiwala Connect
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#6b7280"
              }}
            >
              Collector Dashboard
            </p>

          </div>


          {/* LOCATION STATUS */}

          <div
            style={{
              background:
                location
                  ? "#ecfdf5"
                  : "#fff7ed",

              color:
                location
                  ? "#047857"
                  : "#c2410c",

              padding: "10px 14px",
              borderRadius: "10px",
              fontWeight: 600
            }}
          >

            {location
              ? "📍 Location Ready"
              : "📍 Location Not Set"}

          </div>

        </div>


        {/* ============================================
            QUICK ACTIONS
           ============================================ */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginBottom: "18px"
          }}
        >

          <QuickAction
            icon="📦"
            title="My Lots"
            description="View your collected materials and sell them."
            buttonText="Open My Lots"
            onClick={() =>
              window.location.href =
                "/collector/my-lots"
            }
          />


          <QuickAction
            icon="📍"
            title="My Location"
            description="Update your location to find nearby recyclers."
            buttonText={
              loading
                ? "Getting Location..."
                : "Update Location"
            }
            onClick={getMyLocation}
            disabled={loading}
          />


          <QuickAction
            icon="♻️"
            title="Nearby Recyclers"
            description="Find authorized recyclers near you."
            buttonText="Refresh Recyclers"
            onClick={loadNearbyRecyclers}
            disabled={loadingRecyclers}
          />

        </div>


        {/* ============================================
            LOCATION
           ============================================ */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            boxShadow:
              "0 4px 16px rgba(0,0,0,0.06)",
            marginBottom: "18px"
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px"
            }}
          >

            <div>

              <h2
                style={{
                  margin: "0 0 5px"
                }}
              >
                📍 My Location
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280"
                }}
              >
                Your GPS location is used to find
                nearby authorized recyclers.
              </p>

            </div>


            <button
              onClick={getMyLocation}
              disabled={loading}
              style={{
                padding: "12px 18px",
                border: "none",
                borderRadius: "10px",
                background: loading
                  ? "#9ca3af"
                  : "#2563eb",

                color: "#ffffff",
                fontWeight: 700,

                cursor: loading
                  ? "not-allowed"
                  : "pointer"
              }}
            >
              {loading
                ? "Getting location..."
                : "Get My Location"}
            </button>

          </div>


          {location && (

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",

                gap: "12px",
                marginTop: "18px"
              }}
            >

              <InfoBox
                title="Latitude"
                value={location.latitude}
              />

              <InfoBox
                title="Longitude"
                value={location.longitude}
              />

            </div>

          )}


          {saved && (

            <div
              style={{
                marginTop: "12px",
                color: "#047857",
                fontWeight: 600
              }}
            >
              ✅ Location saved successfully
            </div>

          )}

        </div>


        {/* ============================================
            NEARBY RECYCLERS
           ============================================ */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            boxShadow:
              "0 4px 16px rgba(0,0,0,0.06)"
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}
          >

            <div>

              <h2
                style={{
                  margin: "0 0 5px"
                }}
              >
                ♻️ Nearby Authorized Recyclers
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280"
                }}
              >
                Verified recyclers near your current
                location.
              </p>

            </div>


            {loadingRecyclers && (
              <span
                style={{
                  color: "#6b7280"
                }}
              >
                Loading...
              </span>
            )}

          </div>


          {!loadingRecyclers &&
            recyclers.length === 0 && (

              <div
                style={{
                  marginTop: "18px",
                  padding: "28px",
                  textAlign: "center",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  color: "#6b7280"
                }}
              >

                <div
                  style={{
                    fontSize: "38px",
                    marginBottom: "8px"
                  }}
                >
                  ♻️
                </div>

                No nearby authorized recycler found.

              </div>
            )}


          {!loadingRecyclers &&
            recyclers.length > 0 && (

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(280px, 1fr))",

                  gap: "15px",
                  marginTop: "18px"
                }}
              >

                {recyclers.map(
                  (recycler) => (

                    <div
                      key={
                        recycler.recycler_id
                      }
                      style={{
                        border:
                          "1px solid #e5e7eb",

                        borderRadius: "14px",
                        padding: "18px",
                        background: "#fafafa"
                      }}
                    >

                      <h3
                        style={{
                          margin:
                            "0 0 12px"
                        }}
                      >
                        {
                          recycler.recycler_name
                        }
                      </h3>


                      <p>
                        <strong>
                          📍 Location:
                        </strong>{" "}
                        {
                          recycler.facility_location
                        }
                      </p>


                      <p>
                        <strong>
                          📏 Distance:
                        </strong>{" "}
                        {
                          recycler.distance_km
                        }{" "}
                        km
                      </p>


                      <p>
                        <strong>
                          🚚 Pickup:
                        </strong>{" "}

                        {
                          recycler.pickup_available
                            ? "Available"
                            : "Not Available"
                        }

                      </p>


                      <p
                        style={{
                          marginBottom: 0
                        }}
                      >
                        <strong>
                          🗺️ Service Area:
                        </strong>{" "}

                        {
                          recycler.service_area ||
                          "Not specified"
                        }
                      </p>

                    </div>
                  )
                )}

              </div>
            )}

        </div>


        {/* ============================================
            ERROR
           ============================================ */}

        {error && (

          <div
            style={{
              marginTop: "18px",
              padding: "15px 18px",

              background: "#fef2f2",
              color: "#b91c1c",

              border:
                "1px solid #fecaca",

              borderRadius: "12px",
              fontWeight: 600
            }}
          >
            ❌ {error}
          </div>

        )}

      </div>

      {/* =================================================
          KABADIWALA AI ASSISTANT
         ================================================= */}

      <KabadiwalaAssistant />

    </div>
  );
}

// ======================================================
// QUICK ACTION
// ======================================================

function QuickAction({
  icon,
  title,
  description,
  buttonText,
  onClick,
  disabled = false
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "20px",

        boxShadow:
          "0 4px 16px rgba(0,0,0,0.06)"
      }}
    >

      <div
        style={{
          fontSize: "30px",
          marginBottom: "10px"
        }}
      >
        {icon}
      </div>


      <h3
        style={{
          margin: "0 0 7px"
        }}
      >
        {title}
      </h3>


      <p
        style={{
          color: "#6b7280",
          fontSize: "14px",
          lineHeight: 1.5,
          minHeight: "42px"
        }}
      >
        {description}
      </p>


      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          width: "100%",
          marginTop: "10px",

          padding: "11px",

          border: "none",
          borderRadius: "9px",

          background: disabled
            ? "#9ca3af"
            : "#1b7f3a",

          color: "#ffffff",

          fontWeight: 600,

          cursor: disabled
            ? "not-allowed"
            : "pointer"
        }}
      >
        {buttonText}
      </button>

    </div>
  );
}


// ======================================================
// INFO BOX
// ======================================================

function InfoBox({
  title,
  value
}) {
  return (
    <div
      style={{
        padding: "15px",
        background: "#f9fafb",
        borderRadius: "10px"
      }}
    >

      <div
        style={{
          color: "#6b7280",
          fontSize: "13px"
        }}
      >
        {title}
      </div>


      <div
        style={{
          fontWeight: 700,
          marginTop: "5px",
          wordBreak: "break-word"
        }}
      >
        {value}
      </div>

    </div>
  );
}


export default Dashboard;
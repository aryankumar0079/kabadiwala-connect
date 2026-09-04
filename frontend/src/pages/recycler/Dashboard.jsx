import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

import { useAuth } from "../../auth/AuthContext";

import {
  getSaleRequests,
  markSaleRequestViewed,
  makeOffer
} from "../../services/recyclerService";


// ======================================================
// API BASE URL
// ======================================================

const API_BASE_URL = "http://127.0.0.1:8000";


// ======================================================
// GET AUTH TOKEN
// ======================================================

function getToken() {

  const token =
    localStorage.getItem(
      "access_token"
    );

  if (!token) {

    throw new Error(
      "Recycler login token not found"
    );
  }

  return token;
}


// ======================================================
// COMMON API REQUEST
// ======================================================

async function apiRequest(
  url,
  options = {}
) {

  const token =
    getToken();

  const response =
    await fetch(
      `${API_BASE_URL}${url}`,
      {
        ...options,

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${token}`,

          ...(options.headers || {})
        }
      }
    );

  let data = {};

  try {

    data =
      await response.json();

  } catch {

    data = {};

  }

  if (!response.ok) {

    throw new Error(
      data.detail ||
      data.message ||
      `Request failed (${response.status})`
    );
  }

  return data;
}


// ======================================================
// MAIN COMPONENT
// ======================================================

function Dashboard() {

  const navigate =
    useNavigate();

  const {
    user,
    logout
  } = useAuth();


  // ====================================================
  // SALE REQUEST STATE
  // ====================================================

  const [
    saleRequests,
    setSaleRequests
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState("");


  // ====================================================
  // OFFER STATE
  // ====================================================

  const [
    offerPrices,
    setOfferPrices
  ] = useState({});

  const [
    submittingOffer,
    setSubmittingOffer
  ] = useState(null);


  const [
    message,
    setMessage
  ] = useState("");


  // ====================================================
  // QR STATE
  // ====================================================

  const [
    scannerOpen,
    setScannerOpen
  ] = useState(false);

  const [
    scanner,
    setScanner
  ] = useState(null);

  const [
    scanning,
    setScanning
  ] = useState(false);


  const [
    scannedLotId,
    setScannedLotId
  ] = useState("");

  const [
    verifiedLot,
    setVerifiedLot
  ] = useState(null);

  const [
    verificationLoading,
    setVerificationLoading
  ] = useState(false);

  const [
    handoverLoading,
    setHandoverLoading
  ] = useState(false);


  // ====================================================
  // LIFECYCLE STATE
  // ====================================================

  const [
    lifecycleLoading,
    setLifecycleLoading
  ] = useState(false);


  // ====================================================
  // MY LOTS STATE
  // ====================================================

  const [
    myLots,
    setMyLots
  ] = useState([]);

  const [
    loadingMyLots,
    setLoadingMyLots
  ] = useState(false);

  const [
    myLotsError,
    setMyLotsError
  ] = useState("");


  // ======================================================
  // LOAD MY / ACCEPTED LOTS
  // ======================================================

  async function loadMyLots() {

    try {

      setLoadingMyLots(true);

      setMyLotsError("");

      const data =
        await apiRequest(
          "/transactions/my-lots"
        );

      setMyLots(
        data.lots || []
      );

    } catch (err) {

      setMyLotsError(
        err.message ||
        "Failed to load your lots."
      );

      setMyLots([]);

    } finally {

      setLoadingMyLots(false);

    }
  }


  // ======================================================
  // LOAD SALE REQUESTS
  // ======================================================

  async function loadSaleRequests() {

    try {

      setLoading(true);

      setError("");

      const data =
        await getSaleRequests();

      setSaleRequests(
        data.sale_requests || []
      );

    } catch (err) {

      setError(
        err.message ||
        "Failed to load sale requests."
      );

    } finally {

      setLoading(false);

    }
  }


  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {

    loadSaleRequests();

    loadMyLots();

  }, []);


  // ======================================================
  // LOGOUT
  // ======================================================

  function handleLogout() {

    logout();

    navigate(
      "/login",
      {
        replace: true
      }
    );
  }


  // ======================================================
  // VIEW REQUEST
  // ======================================================

  async function handleViewRequest(
    request
  ) {

    try {

      await markSaleRequestViewed(
        request.sale_request_id
      );

      setSaleRequests(
        (previous) =>
          previous.map(
            (item) =>
              item.sale_request_id ===
              request.sale_request_id
                ? {
                    ...item,
                    recipient_status:
                      "viewed"
                  }
                : item
          )
      );

    } catch (err) {

      setError(
        err.message ||
        "Unable to mark request as viewed."
      );
    }
  }


  // ======================================================
  // OFFER PRICE CHANGE
  // ======================================================

  function handleOfferPriceChange(
    saleRequestId,
    value
  ) {

    setOfferPrices(
      (previous) => ({
        ...previous,
        [saleRequestId]:
          value
      })
    );
  }


  // ======================================================
  // SUBMIT OFFER
  // ======================================================

  async function handleMakeOffer(
    request
  ) {

    const price =
      offerPrices[
        request.sale_request_id
      ];

    if (
      price === undefined ||
      price === "" ||
      Number(price) <= 0
    ) {

      setError(
        "Please enter a valid price per kg."
      );

      return;
    }

    try {

      setSubmittingOffer(
        request.sale_request_id
      );

      setError("");

      setMessage("");

      const data =
        await makeOffer(
          request.sale_request_id,
          Number(price)
        );

      setMessage(
        data.message ||
        "Offer submitted successfully."
      );

      await loadSaleRequests();

    } catch (err) {

      setError(
        err.message ||
        "Failed to submit offer."
      );

    } finally {

      setSubmittingOffer(
        null
      );
    }
  }


  // ======================================================
  // OPEN QR SCANNER
  // ======================================================

  async function openScanner() {

    try {

      setError("");

      setMessage("");

      setScannedLotId("");

      setVerifiedLot(null);

      setScannerOpen(true);

      setScanning(true);

      setTimeout(
        async () => {

          try {

            const qrScanner =
              new Html5Qrcode(
                "qr-reader"
              );

            setScanner(
              qrScanner
            );

            await qrScanner.start(

              {
                facingMode:
                  "environment"
              },

              {
                fps: 10,

                qrbox: {
                  width: 250,
                  height: 250
                }
              },

              async (
                decodedText
              ) => {

                await handleQRCode(
                  decodedText,
                  qrScanner
                );
              },

              () => {
                // Ignore frames without QR detection.
              }
            );

          } catch (err) {

            console.error(
              "QR scanner error:",
              err
            );

            setScanning(
              false
            );

            setError(
              "Unable to start camera. Please allow camera permission."
            );

          }

        },

        200
      );

    } catch (err) {

      setScannerOpen(
        false
      );

      setScanning(
        false
      );

      setError(
        err.message ||
        "Unable to open QR scanner."
      );

    }
  }


  // ======================================================
  // QR CODE RESULT
  // ======================================================

  async function handleQRCode(
    decodedText,
    qrScanner
  ) {

    if (!decodedText) {

      return;
    }

    try {

      await qrScanner.stop();

    } catch {

      // Scanner may already be stopped.

    }

    setScanning(
      false
    );


    let lotId =
      decodedText.trim();


    /*
     * Existing Lot QR normally contains
     * only the lot_id.
     */

    try {

      if (
        lotId.startsWith(
          "http://"
        ) ||
        lotId.startsWith(
          "https://"
        )
      ) {

        const url =
          new URL(lotId);

        const queryLotId =
          url.searchParams.get(
            "lot_id"
          );

        if (queryLotId) {

          lotId =
            queryLotId;

        }

      }

    } catch {

      // Keep original decoded text.

    }


    setScannedLotId(
      lotId
    );

    await verifyScannedLot(
      lotId
    );
  }


  // ======================================================
  // VERIFY SCANNED LOT
  // ======================================================

  async function verifyScannedLot(
    lotId
  ) {

    try {

      setVerificationLoading(
        true
      );

      setError("");

      setMessage("");

      setVerifiedLot(
        null
      );

      const data =
        await apiRequest(
          `/material/verify/${encodeURIComponent(
            lotId
          )}`
        );

      setVerifiedLot(
        data
      );

    } catch (err) {

      setError(
        err.message ||
        "Unable to verify this lot."
      );

    } finally {

      setVerificationLoading(
        false
      );
    }
  }


  // ======================================================
  // HANDOVER MATERIAL
  // ======================================================

  async function handleHandover() {

    if (!scannedLotId) {

      setError(
        "Please scan a valid lot QR first."
      );

      return;
    }

    try {

      setHandoverLoading(
        true
      );

      setError("");

      setMessage("");

      const data =
        await apiRequest(
          `/transactions/handover/${encodeURIComponent(
            scannedLotId
          )}`,
          {
            method:
              "POST"
          }
        );

      setMessage(
        data.message ||
        "Material handover completed successfully."
      );

      setVerifiedLot(
        (previous) =>
          previous
            ? {
                ...previous,
                status:
                  "handed_over"
              }
            : previous
      );

      await closeScanner();

      await loadSaleRequests();

      await loadMyLots();

    } catch (err) {

      setError(
        err.message ||
        "Material handover failed."
      );

    } finally {

      setHandoverLoading(
        false
      );
    }
  }


  // ======================================================
  // UPDATE MATERIAL LIFECYCLE
  // ======================================================

  async function updateLifecycle(
    action,
    lotId = scannedLotId
  ) {

    if (!lotId) {

      setError(
        "Please select or scan a valid lot first."
      );

      return;
    }


    try {

      setLifecycleLoading(
        true
      );

      setError("");

      setMessage("");


      let endpoint = "";


      if (action === "received") {

        endpoint =
          `/transactions/received/${encodeURIComponent(
            lotId
          )}`;

      } else if (action === "processing") {

        endpoint =
          `/transactions/processing/${encodeURIComponent(
            lotId
          )}`;

      } else if (action === "recycled") {

        endpoint =
          `/transactions/recycled/${encodeURIComponent(
            lotId
          )}`;

      } else {

        throw new Error(
          "Invalid lifecycle action"
        );

      }


      const data =
        await apiRequest(
          endpoint,
          {
            method: "POST"
          }
        );


      setMessage(
        data.message ||
        `Material status updated to ${action}.`
      );


      if (
        scannedLotId === lotId
      ) {

        setVerifiedLot(
          (previous) =>
            previous
              ? {
                  ...previous,
                  status: action
                }
              : previous
        );

      }


      await loadMyLots();

      await loadSaleRequests();


    } catch (err) {

      setError(
        err.message ||
        "Unable to update material status."
      );


    } finally {

      setLifecycleLoading(
        false
      );

    }

  }


  // ======================================================
  // CLOSE SCANNER
  // ======================================================

  async function closeScanner() {

    if (scanner) {

      try {

        const state =
          scanner.getState();


        /*
         * 2 = scanning
         */

        if (state === 2) {

          await scanner.stop();

        }


        try {

          scanner.clear();

        } catch {

          // Ignore clear errors.

        }

      } catch (err) {

        console.error(
          "Error closing scanner:",
          err
        );

      }
    }


    setScanner(
      null
    );

    setScanning(
      false
    );

    setScannerOpen(
      false
    );

  }


  // ======================================================
  // CLEANUP SCANNER
  // ======================================================

  useEffect(() => {

    return () => {

      if (scanner) {

        try {

          scanner.stop();

        } catch {

          // Ignore cleanup errors.

        }

      }

    };

  }, [scanner]);


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
          maxWidth: "1200px",
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            border: "1px solid #e5e9e6",
            marginBottom: "24px"
          }}
        >

          <div>

            <h1
              style={{
                margin: 0,
                color: "#1b7f3a"
              }}
            >
              Recycler Dashboard
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#777"
              }}
            >
              Kabadiwala Connect
            </p>

          </div>


          <button
            onClick={
              handleLogout
            }
            style={{
              border: "none",
              borderRadius: "9px",
              padding: "10px 18px",
              background: "#fff0f0",
              color: "#c62828",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Logout
          </button>

        </div>


        {/* =================================================
            WELCOME
           ================================================= */}

        <div
          style={{
            background: "#1b7f3a",
            color: "#ffffff",
            borderRadius: "18px",
            padding: "28px",
            marginBottom: "24px"
          }}
        >

          <h2
            style={{
              margin: 0
            }}
          >
            Welcome Recycler 👋
          </h2>

          <p
            style={{
              margin: "10px 0 0",
              opacity: 0.9
            }}
          >
            View nearby material sale requests,
            submit competitive offers and
            complete QR-based material handovers.
          </p>

        </div>


        {/* =================================================
            ACCOUNT
           ================================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "20px 24px",
            border: "1px solid #e5e9e6",
            marginBottom: "24px"
          }}
        >

          <strong>
            Recycler User ID:
          </strong>{" "}
          {user?.user_id || "N/A"}

          <span
            style={{
              marginLeft: "25px"
            }}
          >

            <strong>
              Role:
            </strong>{" "}
            {user?.role || "recycler"}

          </span>

        </div>


        {/* =================================================
            MESSAGES
           ================================================= */}

        {message && (

          <div
            style={{
              marginBottom: "18px",
              background: "#eef9f1",
              color: "#1b7f3a",
              padding: "13px 15px",
              borderRadius: "10px"
            }}
          >
            ✅ {message}
          </div>

        )}


        {error && (

          <div
            style={{
              marginBottom: "18px",
              background: "#fff0f0",
              color: "#c62828",
              padding: "13px 15px",
              borderRadius: "10px"
            }}
          >
            ❌ {error}
          </div>

        )}


        {/* =================================================
            QR HANDOVER CARD
           ================================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e5e9e6",
            padding: "24px",
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
                Material Handover
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#777"
                }}
              >
                Scan the collector's existing Lot QR
                to verify and complete handover.
              </p>

            </div>


            {!scannerOpen && (

              <button
                type="button"
                onClick={
                  openScanner
                }
                style={{
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 18px",
                  background: "#1b7f3a",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                📷 Scan Lot QR
              </button>

            )}

          </div>


          {/* =================================================
              SCANNER
             ================================================= */}

          {scannerOpen && (

            <div
              style={{
                marginTop: "22px",
                borderTop:
                  "1px solid #e5e9e6",
                paddingTop: "22px"
              }}
            >

              <div
                id="qr-reader"
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  margin: "0 auto"
                }}
              />

              <div
                style={{
                  textAlign: "center",
                  marginTop: "15px"
                }}
              >

                {scanning && (

                  <p
                    style={{
                      color: "#777",
                      margin: "0 0 12px"
                    }}
                  >
                    Point the camera at the
                    material lot QR.
                  </p>

                )}

                <button
                  type="button"
                  onClick={
                    closeScanner
                  }
                  style={{
                    border:
                      "1px solid #d5d9d6",
                    borderRadius: "9px",
                    padding: "10px 18px",
                    background: "#ffffff",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Close Scanner
                </button>

              </div>

            </div>

          )}


          {/* =================================================
              SCANNED LOT
             ================================================= */}

          {scannedLotId && (

            <div
              style={{
                marginTop: "20px",
                background: "#f8faf8",
                border:
                  "1px solid #e5eae6",
                borderRadius: "12px",
                padding: "18px"
              }}
            >

              <h3
                style={{
                  marginTop: 0
                }}
              >
                Scanned Lot
              </h3>

              <InfoRow
                label="Lot ID"
                value={
                  scannedLotId
                }
              />


              {verificationLoading ? (

                <p
                  style={{
                    color: "#777"
                  }}
                >
                  Verifying lot...
                </p>

              ) : verifiedLot ? (

                <>

                  <InfoRow
                    label="Material"
                    value={
                      verifiedLot.material_category ||
                      "-"
                    }
                  />

                  <InfoRow
                    label="Sub Category"
                    value={
                      verifiedLot.material_sub_category ||
                      "-"
                    }
                  />

                  <InfoRow
                    label="Weight"
                    value={
                      verifiedLot.approximate_weight !==
                      undefined
                        ? `${verifiedLot.approximate_weight} kg`
                        : "-"
                    }
                  />

                  <InfoRow
                    label="Collector ID"
                    value={
                      verifiedLot.collector_id ||
                      "-"
                    }
                  />

                  <InfoRow
                    label="Current Status"
                    value={
                      verifiedLot.status ||
                      "-"
                    }
                  />


                  <button
                    type="button"
                    onClick={
                      handleHandover
                    }
                    disabled={
                      handoverLoading ||
                      verifiedLot.status ===
                        "handed_over"
                    }
                    style={{
                      width: "100%",
                      marginTop: "15px",
                      border: "none",
                      borderRadius: "10px",
                      padding: "12px",
                      background:
                        handoverLoading ||
                        verifiedLot.status ===
                          "handed_over"
                          ? "#b7bdb9"
                          : "#1b7f3a",
                      color: "#ffffff",
                      fontWeight: 600,
                      cursor:
                        handoverLoading ||
                        verifiedLot.status ===
                          "handed_over"
                          ? "not-allowed"
                          : "pointer"
                    }}
                  >
                    {handoverLoading
                      ? "Completing Handover..."
                      : verifiedLot.status ===
                        "handed_over"
                      ? "Handover Completed"
                      : "✅ Complete Handover"}
                  </button>


                  {/* =================================================
                      MATERIAL LIFECYCLE ACTIONS
                     ================================================= */}

                  {verifiedLot.status ===
                    "handed_over" && (

                    <button
                      type="button"
                      onClick={() =>
                        updateLifecycle(
                          "received"
                        )
                      }
                      disabled={
                        lifecycleLoading
                      }
                      style={{
                        width: "100%",
                        marginTop: "10px",
                        border: "none",
                        borderRadius: "10px",
                        padding: "12px",
                        background:
                          lifecycleLoading
                            ? "#b7bdb9"
                            : "#2563eb",
                        color: "#ffffff",
                        fontWeight: 600,
                        cursor:
                          lifecycleLoading
                            ? "not-allowed"
                            : "pointer"
                      }}
                    >
                      {lifecycleLoading
                        ? "Updating..."
                        : "📦 Mark as Received"}
                    </button>

                  )}


                  {verifiedLot.status ===
                    "received" && (

                    <button
                      type="button"
                      onClick={() =>
                        updateLifecycle(
                          "processing"
                        )
                      }
                      disabled={
                        lifecycleLoading
                      }
                      style={{
                        width: "100%",
                        marginTop: "10px",
                        border: "none",
                        borderRadius: "10px",
                        padding: "12px",
                        background:
                          lifecycleLoading
                            ? "#b7bdb9"
                            : "#d97706",
                        color: "#ffffff",
                        fontWeight: 600,
                        cursor:
                          lifecycleLoading
                            ? "not-allowed"
                            : "pointer"
                      }}
                    >
                      {lifecycleLoading
                        ? "Updating..."
                        : "⚙️ Start Processing"}
                    </button>

                  )}


                  {verifiedLot.status ===
                    "processing" && (

                    <button
                      type="button"
                      onClick={() =>
                        updateLifecycle(
                          "recycled"
                        )
                      }
                      disabled={
                        lifecycleLoading
                      }
                      style={{
                        width: "100%",
                        marginTop: "10px",
                        border: "none",
                        borderRadius: "10px",
                        padding: "12px",
                        background:
                          lifecycleLoading
                            ? "#b7bdb9"
                            : "#1b7f3a",
                        color: "#ffffff",
                        fontWeight: 600,
                        cursor:
                          lifecycleLoading
                            ? "not-allowed"
                            : "pointer"
                      }}
                    >
                      {lifecycleLoading
                        ? "Updating..."
                        : "♻️ Mark as Recycled"}
                    </button>

                  )}


                  {verifiedLot.status ===
                    "recycled" && (

                    <div
                      style={{
                        marginTop: "15px",
                        background: "#eef9f1",
                        color: "#1b7f3a",
                        border:
                          "1px solid #d4ecd9",
                        borderRadius: "10px",
                        padding: "13px",
                        textAlign: "center",
                        fontWeight: 600
                      }}
                    >
                      ✅ Material Recycled Successfully
                    </div>

                  )}

                </>

              ) : (

                <p
                  style={{
                    color: "#c62828"
                  }}
                >
                  Lot could not be verified.
                </p>

              )}

            </div>

          )}

        </div>


        {/* =================================================
            MY ACCEPTED / ASSIGNED LOTS
           ================================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border:
              "1px solid #e5e9e6",
            padding: "24px",
            marginBottom: "24px"
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "15px",
              marginBottom: "20px"
            }}
          >

            <div>

              <h2
                style={{
                  margin: 0
                }}
              >
                My Accepted Lots
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#777"
                }}
              >
                View accepted lots, complete handover and
                continue the recycling lifecycle.
              </p>

            </div>


            <button
              type="button"
              onClick={
                loadMyLots
              }
              disabled={
                loadingMyLots
              }
              style={{
                border:
                  "1px solid #1b7f3a",
                borderRadius: "9px",
                padding: "9px 14px",
                background: "#ffffff",
                color: "#1b7f3a",
                fontWeight: 600,
                cursor:
                  loadingMyLots
                    ? "not-allowed"
                    : "pointer"
              }}
            >
              {loadingMyLots
                ? "Loading..."
                : "Refresh"}
            </button>

          </div>


          {/* =================================================
              MY LOTS ERROR
             ================================================= */}

          {myLotsError && (

            <div
              style={{
                marginBottom: "18px",
                background: "#fff0f0",
                color: "#c62828",
                padding: "13px 15px",
                borderRadius: "10px"
              }}
            >
              ❌ {myLotsError}
            </div>

          )}


          {/* =================================================
              MY LOTS LOADING
             ================================================= */}

          {loadingMyLots ? (

            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#777"
              }}
            >
              Loading your accepted lots...
            </div>

          ) : myLots.length ===
            0 ? (

            <div
              style={{
                padding: "35px",
                textAlign: "center",
                color: "#777",
                background: "#f8faf8",
                borderRadius: "12px"
              }}
            >

              <div
                style={{
                  fontSize: "40px",
                  marginBottom: "10px"
                }}
              >
                📦
              </div>

              <h3
                style={{
                  margin: "0 0 7px",
                  color: "#444"
                }}
              >
                No accepted lots yet
              </h3>

              <p
                style={{
                  margin: 0
                }}
              >
                Lots will appear here after a
                completed handover.
              </p>

            </div>

          ) : (

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "18px"
              }}
            >

              {myLots.map(
                (lot) => (

                  <MyLotCard
                    key={
                      lot.lot_id
                    }
                    lot={
                      lot
                    }
                    onRefresh={
                      loadMyLots
                    }
                    onLifecycleUpdate={
                      updateLifecycle
                    }
                    lifecycleLoading={
                      lifecycleLoading
                    }
                  />

                )
              )}

            </div>

          )}

        </div>


        {/* =================================================
            SALE REQUESTS
           ================================================= */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border:
              "1px solid #e5e9e6",
            padding: "24px"
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: "20px"
            }}
          >

            <h2
              style={{
                margin: 0
              }}
            >
              New Material Requests
            </h2>


            <button
              onClick={
                loadSaleRequests
              }
              disabled={loading}
              style={{
                border:
                  "1px solid #1b7f3a",
                borderRadius: "9px",
                padding: "9px 14px",
                background: "#ffffff",
                color: "#1b7f3a",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Refresh
            </button>

          </div>


          {loading ? (

            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#777"
              }}
            >
              Loading sale requests...
            </div>

          ) : saleRequests.length ===
            0 ? (

            <div
              style={{
                padding: "35px",
                textAlign: "center",
                color: "#777"
              }}
            >

              <div
                style={{
                  fontSize: "40px",
                  marginBottom: "10px"
                }}
              >
                📭
              </div>

              <h3
                style={{
                  margin: "0 0 7px",
                  color: "#444"
                }}
              >
                No new requests
              </h3>

              <p
                style={{
                  margin: 0
                }}
              >
                New collector sale requests
                will appear here.
              </p>

            </div>

          ) : (

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "18px"
              }}
            >

              {saleRequests.map(
                (request) => (

                  <SaleRequestCard
                    key={
                      request.sale_request_id
                    }

                    request={
                      request
                    }

                    offerPrice={
                      offerPrices[
                        request.sale_request_id
                      ] || ""
                    }

                    submitting={
                      submittingOffer ===
                      request.sale_request_id
                    }

                    onView={() =>
                      handleViewRequest(
                        request
                      )
                    }

                    onPriceChange={(value) =>
                      handleOfferPriceChange(
                        request.sale_request_id,
                        value
                      )
                    }

                    onMakeOffer={() =>
                      handleMakeOffer(
                        request
                      )
                    }
                  />

                )
              )}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}


// ==========================================================
// SALE REQUEST CARD
// ==========================================================

function SaleRequestCard({
  request,
  offerPrice,
  submitting,
  onView,
  onPriceChange,
  onMakeOffer
}) {

  return (

    <div
      style={{
        border:
          "1px solid #e3e7e4",
        borderRadius: "15px",
        padding: "20px",
        background: "#fafcfb"
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: "12px",
          marginBottom: "16px"
        }}
      >

        <div>

          <h3
            style={{
              margin: 0
            }}
          >
            {request.material_category}
          </h3>

          {request.material_sub_category && (

            <p
              style={{
                margin: "5px 0 0",
                color: "#777",
                fontSize: "13px"
              }}
            >
              {
                request.material_sub_category
              }
            </p>

          )}

        </div>


        <span
          style={{
            background: "#eaf5ed",
            color: "#1b7f3a",
            borderRadius: "20px",
            padding: "6px 10px",
            fontSize: "12px",
            fontWeight: 600,
            height: "fit-content"
          }}
        >
          {
            request.recipient_status
          }
        </span>

      </div>


      <InfoRow
        label="Lot ID"
        value={
          request.lot_id
        }
      />

      <InfoRow
        label="Collector ID"
        value={
          request.collector_id
        }
      />

      <InfoRow
        label="Weight"
        value={
          `${request.weight_kg} kg`
        }
      />

      <InfoRow
        label="Distance"
        value={
          request.distance_km !==
            null &&
          request.distance_km !==
            undefined
            ? `${request.distance_km} km`
            : "N/A"
        }
      />

      <InfoRow
        label="Estimated Value"
        value={
          request.estimated_value !==
              null &&
          request.estimated_value !==
              undefined
            ? `₹${request.estimated_value}`
            : "N/A"
        }
      />


      <button
        onClick={
          onView
        }
        style={{
          width: "100%",
          marginTop: "16px",
          border:
            "1px solid #1b7f3a",
          borderRadius: "9px",
          padding: "10px",
          background: "#ffffff",
          color: "#1b7f3a",
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        Mark as Viewed
      </button>


      <div
        style={{
          marginTop: "15px",
          paddingTop: "15px",
          borderTop:
            "1px solid #e4e8e5"
        }}
      >

        <label
          style={{
            display: "block",
            marginBottom: "7px",
            fontWeight: 600,
            fontSize: "14px"
          }}
        >
          Your Offer (₹ / kg)
        </label>


        <input
          type="number"
          min="0"
          step="0.01"
          value={
            offerPrice
          }
          onChange={(event) =>
            onPriceChange(
              event.target.value
            )
          }
          placeholder="Enter price per kg"
          style={{
            width: "100%",
            boxSizing:
              "border-box",
            padding: "11px",
            border:
              "1px solid #d5dbd7",
            borderRadius: "9px",
            fontSize: "14px"
          }}
        />


        <button
          onClick={
            onMakeOffer
          }
          disabled={
            submitting
          }
          style={{
            width: "100%",
            marginTop: "10px",
            border: "none",
            borderRadius: "9px",
            padding: "11px",
            background:
              submitting
                ? "#9e9e9e"
                : "#1b7f3a",
            color: "#ffffff",
            fontWeight: 600,
            cursor:
              submitting
                ? "not-allowed"
                : "pointer"
          }}
        >
          {submitting
            ? "Submitting..."
            : "Make Offer"}
        </button>

      </div>

    </div>
  );
}


// ==========================================================
// MY LOT CARD
// ==========================================================

function MyLotCard({
  lot,
  onRefresh,
  onLifecycleUpdate,
  lifecycleLoading
}) {

  const status =
    lot.lot_status ||
    lot.latest_transaction_status ||
    "unknown";


  return (

    <div
      style={{
        border:
          "1px solid #e3e7e4",
        borderRadius: "15px",
        padding: "20px",
        background: "#fafcfb"
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: "12px",
          marginBottom: "16px"
        }}
      >

        <div>

          <h3
            style={{
              margin: 0
            }}
          >
            {
              lot.material_category ||
              "Unknown Material"
            }
          </h3>


          {lot.material_sub_category && (

            <p
              style={{
                margin: "5px 0 0",
                color: "#777",
                fontSize: "13px"
              }}
            >
              {
                lot.material_sub_category
              }
            </p>

          )}

        </div>


        <span
          style={{
            background:
              "#eaf5ed",
            color:
              "#1b7f3a",
            borderRadius:
              "20px",
            padding:
              "6px 10px",
            fontSize:
              "12px",
            fontWeight:
              600,
            whiteSpace:
              "nowrap"
          }}
        >
          {
            formatStatus(
              status
            )
          }
        </span>

      </div>


      <InfoRow
        label="Lot ID"
        value={
          lot.lot_id
        }
      />

      <InfoRow
        label="Collector ID"
        value={
          lot.collector_id
        }
      />

      <InfoRow
        label="Weight"
        value={
          lot.approximate_weight !==
          undefined
            ? `${lot.approximate_weight} kg`
            : "N/A"
        }
      />

      <InfoRow
        label="Location"
        value={
          lot.location ||
          "N/A"
        }
      />

      <InfoRow
        label="Latest Event"
        value={
          lot.latest_transaction_type
            ? formatStatus(
                lot.latest_transaction_type
              )
            : "N/A"
        }
      />


      {/* ==================================================
          NEXT ACTION
         ================================================== */}

      {status ===
        "offer_accepted" && (

        <div
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginTop: "16px",
            padding: "11px",
            borderRadius: "9px",
            background: "#fff8e8",
            color: "#8a5a00",
            textAlign: "center",
            fontWeight: 600
          }}
        >
          ⏳ Offer Accepted — Awaiting QR Handover
        </div>

      )}


      {status ===
        "handed_over" && (

        <button
          type="button"
          onClick={() =>
            onLifecycleUpdate(
              "received",
              lot.lot_id
            )
          }
          disabled={
            lifecycleLoading
          }
          style={{
            width: "100%",
            marginTop: "16px",
            border: "none",
            borderRadius:
              "9px",
            padding:
              "11px",
            background:
              lifecycleLoading
                ? "#b7bdb9"
                : "#2563eb",
            color:
              "#ffffff",
            fontWeight:
              600,
            cursor:
              lifecycleLoading
                ? "not-allowed"
                : "pointer"
          }}
        >
          {
            lifecycleLoading
              ? "Updating..."
              : "📦 Mark as Received"
          }
        </button>

      )}


      {status ===
        "received" && (

        <button
          type="button"
          onClick={() =>
            onLifecycleUpdate(
              "processing",
              lot.lot_id
            )
          }
          disabled={
            lifecycleLoading
          }
          style={{
            width: "100%",
            marginTop: "16px",
            border: "none",
            borderRadius:
              "9px",
            padding:
              "11px",
            background:
              lifecycleLoading
                ? "#b7bdb9"
                : "#d97706",
            color:
              "#ffffff",
            fontWeight:
              600,
            cursor:
              lifecycleLoading
                ? "not-allowed"
                : "pointer"
          }}
        >
          {
            lifecycleLoading
              ? "Updating..."
              : "⚙️ Start Processing"
          }
        </button>

      )}


      {status ===
        "processing" && (

        <button
          type="button"
          onClick={() =>
            onLifecycleUpdate(
              "recycled",
              lot.lot_id
            )
          }
          disabled={
            lifecycleLoading
          }
          style={{
            width: "100%",
            marginTop: "16px",
            border: "none",
            borderRadius:
              "9px",
            padding:
              "11px",
            background:
              lifecycleLoading
                ? "#b7bdb9"
                : "#1b7f3a",
            color:
              "#ffffff",
            fontWeight:
              600,
            cursor:
              lifecycleLoading
                ? "not-allowed"
                : "pointer"
          }}
        >
          {
            lifecycleLoading
              ? "Updating..."
              : "♻️ Mark as Recycled"
          }
        </button>

      )}


      {status ===
        "recycled" && (

        <div
          style={{
            width: "100%",
            boxSizing:
              "border-box",
            marginTop: "16px",
            padding:
              "11px",
            borderRadius:
              "9px",
            background:
              "#eef9f1",
            color:
              "#1b7f3a",
            textAlign:
              "center",
            fontWeight:
              600
          }}
        >
          ✅ Material Recycled
        </div>

      )}


      <button
        type="button"
        onClick={
          onRefresh
        }
        style={{
          width: "100%",
          marginTop: "10px",
          border:
            "1px solid #d5d9d6",
          borderRadius:
            "9px",
          padding:
            "10px",
          background:
            "#ffffff",
          fontWeight:
            600,
          cursor:
            "pointer"
        }}
      >
        Refresh Lot Status
      </button>

    </div>
  );
}


// ==========================================================
// FORMAT STATUS
// ==========================================================

function formatStatus(
  status
) {

  return String(
    status
  )
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
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
        justifyContent:
          "space-between",
        gap: "15px",
        padding: "7px 0",
        fontSize: "13px"
      }}
    >

      <span
        style={{
          color: "#777"
        }}
      >
        {
          label
        }
      </span>

      <strong
        style={{
          textAlign:
            "right",
          wordBreak:
            "break-word"
        }}
      >
        {
          value
        }
      </strong>

    </div>

  );
}


export default Dashboard;
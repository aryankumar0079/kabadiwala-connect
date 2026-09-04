import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getMyLots,
  sellLot,
  getLotQR
} from "../../services/lotService";


// ======================================================
// MAIN COMPONENT
// ======================================================

function MyLots() {

  const [lots, setLots] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [sellingLotId, setSellingLotId] =
    useState(null);

  const [confirmLot, setConfirmLot] =
    useState(null);

  const [qrLotId, setQrLotId] =
    useState(null);

  const [qrImageUrl, setQrImageUrl] =
    useState("");

  const [qrLoading, setQrLoading] =
    useState(false);


  // ======================================================
  // LOAD MY LOTS
  // ======================================================

  async function loadLots() {

    try {

      setLoading(true);
      setError("");

      const data = await getMyLots();

      /*
       * Backend normally returns:
       *
       * {
       *   count: ...,
       *   lots: [...]
       * }
       *
       * This also handles a direct array.
       */

      if (Array.isArray(data)) {

        setLots(data);

      } else if (Array.isArray(data.lots)) {

        setLots(data.lots);

      } else {

        setLots([]);

      }

    } catch (err) {

      setError(
        err.message ||
        "Failed to load your lots."
      );

    } finally {

      setLoading(false);

    }
  }


  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {

    loadLots();

  }, []);


  // ======================================================
  // OPEN SELL CONFIRMATION
  // ======================================================

  function handleSellClick(lot) {

    setError("");
    setSuccess("");

    setConfirmLot(lot);

  }


  // ======================================================
  // CONFIRM SELL
  // ======================================================

  async function handleConfirmSell() {

    if (!confirmLot) {
      return;
    }

    try {

      setSellingLotId(
        confirmLot.lot_id
      );

      setError("");
      setSuccess("");

      const data = await sellLot(
        confirmLot.lot_id
      );

      setSuccess(
        data.message ||
        "Sale request created successfully."
      );

      /*
       * Update current lot locally.
       */

      setLots((previousLots) =>
        previousLots.map((lot) =>
          lot.lot_id ===
          confirmLot.lot_id
            ? {
                ...lot,
                status:
                  data.status ||
                  "recyclers_notified"
              }
            : lot
        )
      );

      setConfirmLot(null);

    } catch (err) {

      setError(
        err.message ||
        "Unable to sell this lot."
      );

    } finally {

      setSellingLotId(null);

    }
  }


  // ======================================================
  // CANCEL SELL CONFIRMATION
  // ======================================================

  function handleCancelSell() {

    if (sellingLotId) {
      return;
    }

    setConfirmLot(null);

  }


  // ======================================================
  // OPEN QR
  // ======================================================

  async function handleShowQR(lot) {

    try {

      setError("");

      setQrLoading(true);

      setQrLotId(lot.lot_id);

      setQrImageUrl("");

      /*
       * Existing backend QR endpoint is used.
       */

      const blob = await getLotQR(
        lot.lot_id
      );

      const imageUrl =
        URL.createObjectURL(blob);

      setQrImageUrl(imageUrl);

    } catch (err) {

      setQrLotId(null);

      setError(
        err.message ||
        "Unable to load QR code."
      );

    } finally {

      setQrLoading(false);

    }
  }


  // ======================================================
  // CLOSE QR
  // ======================================================

  function handleCloseQR() {

    if (qrImageUrl) {

      URL.revokeObjectURL(
        qrImageUrl
      );

    }

    setQrImageUrl("");

    setQrLotId(null);

  }


  // ======================================================
  // DOWNLOAD QR
  // ======================================================

  function handleDownloadQR() {

    if (!qrImageUrl || !qrLotId) {
      return;
    }

    const link =
      document.createElement("a");

    link.href = qrImageUrl;

    link.download =
      `${qrLotId}-QR.png`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  }


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
            padding: "22px 24px",
            border: "1px solid #e4e9e5",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px"
          }}
        >

          <div>

            <h1
              style={{
                margin: 0
              }}
            >
              My Lots
            </h1>

            <p
              style={{
                margin: "7px 0 0",
                color: "#777"
              }}
            >
              View your collected materials,
              track status and sell them to
              approved recyclers.
            </p>

          </div>


          <button
            onClick={loadLots}
            disabled={loading}
            style={{
              border: "1px solid #1b7f3a",
              borderRadius: "9px",
              padding: "10px 15px",
              background: "#ffffff",
              color: "#1b7f3a",
              fontWeight: 600,
              cursor: loading
                ? "not-allowed"
                : "pointer"
            }}
          >
            Refresh
          </button>

        </div>


        {/* =================================================
            SUCCESS MESSAGE
           ================================================= */}

        {success && (

          <div
            style={{
              marginBottom: "18px",
              padding: "14px 16px",
              borderRadius: "10px",
              background: "#eef9f1",
              color: "#1b7f3a",
              border: "1px solid #d4ecd9"
            }}
          >
            ✅ {success}
          </div>

        )}


        {/* =================================================
            ERROR MESSAGE
           ================================================= */}

        {error && (

          <div
            style={{
              marginBottom: "18px",
              padding: "14px 16px",
              borderRadius: "10px",
              background: "#fff0f0",
              color: "#c62828",
              border: "1px solid #f0d3d3"
            }}
          >
            ❌ {error}
          </div>

        )}


        {/* =================================================
            LOADING
           ================================================= */}

        {loading ? (

          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "50px",
              textAlign: "center",
              color: "#777"
            }}
          >
            Loading your lots...
          </div>

        ) : lots.length === 0 ? (

          /* ===============================================
             EMPTY STATE
             =============================================== */

          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "50px",
              textAlign: "center",
              border: "1px solid #e4e9e5"
            }}
          >

            <div
              style={{
                fontSize: "48px",
                marginBottom: "15px"
              }}
            >
              📦
            </div>

            <h2
              style={{
                margin: "0 0 8px"
              }}
            >
              No lots found
            </h2>

            <p
              style={{
                color: "#777",
                margin: "0 0 20px"
              }}
            >
              Create your first material lot
              to see it here.
            </p>

            <Link
              to="/collector/create-lot"
              style={{
                display: "inline-block",
                textDecoration: "none",
                background: "#1b7f3a",
                color: "#ffffff",
                padding: "11px 18px",
                borderRadius: "9px",
                fontWeight: 600
              }}
            >
              Create Lot
            </Link>

          </div>

        ) : (

          /* ===============================================
             LOT GRID
             =============================================== */

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "18px"
            }}
          >

            {lots.map((lot) => (

              <LotCard
                key={lot.lot_id}
                lot={lot}
                onSell={() =>
                  handleSellClick(lot)
                }
                onShowQR={() =>
                  handleShowQR(lot)
                }
                selling={
                  sellingLotId ===
                  lot.lot_id
                }
              />

            ))}

          </div>

        )}

      </div>


      {/* ====================================================
          SELL CONFIRMATION MODAL
         ==================================================== */}

      {confirmLot && (

        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#ffffff",
              borderRadius: "18px",
              padding: "25px",
              boxSizing: "border-box"
            }}
          >

            <h2
              style={{
                marginTop: 0,
                marginBottom: "8px"
              }}
            >
              Sell this lot?
            </h2>

            <p
              style={{
                color: "#666",
                lineHeight: 1.5,
                marginTop: 0
              }}
            >
              This will send a sale request to
              suitable approved recyclers near you.
            </p>

            <div
              style={{
                background: "#f8faf8",
                borderRadius: "12px",
                padding: "15px",
                marginTop: "18px"
              }}
            >

              <InfoRow
                label="Lot ID"
                value={confirmLot.lot_id}
              />

              <InfoRow
                label="Material"
                value={
                  confirmLot.material_category ||
                  "N/A"
                }
              />

              <InfoRow
                label="Weight"
                value={
                  confirmLot.approximate_weight !==
                  undefined
                    ? `${confirmLot.approximate_weight} kg`
                    : "N/A"
                }
              />

              <InfoRow
                label="Estimated Value"
                value={
                  confirmLot.estimated_value !==
                    null &&
                  confirmLot.estimated_value !==
                    undefined
                    ? `₹${confirmLot.estimated_value}`
                    : "N/A"
                }
              />

            </div>


            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "22px"
              }}
            >

              <button
                onClick={handleCancelSell}
                disabled={Boolean(
                  sellingLotId
                )}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "9px",
                  border:
                    "1px solid #d5d9d6",
                  background: "#ffffff",
                  cursor:
                    sellingLotId
                      ? "not-allowed"
                      : "pointer"
                }}
              >
                Cancel
              </button>


              <button
                onClick={handleConfirmSell}
                disabled={Boolean(
                  sellingLotId
                )}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  borderRadius: "9px",
                  background:
                    sellingLotId
                      ? "#9e9e9e"
                      : "#1b7f3a",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor:
                    sellingLotId
                      ? "not-allowed"
                      : "pointer"
                }}
              >
                {sellingLotId
                  ? "Sending..."
                  : "SELL NOW"}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ====================================================
          QR MODAL
         ==================================================== */}

      {qrLotId && (

        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1100
          }}
        >

          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#ffffff",
              borderRadius: "18px",
              padding: "25px",
              boxSizing: "border-box",
              textAlign: "center"
            }}
          >

            <h2
              style={{
                marginTop: 0
              }}
            >
              Material Lot QR
            </h2>

            <p
              style={{
                color: "#777",
                fontSize: "13px"
              }}
            >
              This QR identifies your material lot.
            </p>


            <div
              style={{
                minHeight: "250px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "20px 0"
              }}
            >

              {qrLoading ? (

                <div
                  style={{
                    color: "#777"
                  }}
                >
                  Loading QR...
                </div>

              ) : qrImageUrl ? (

                <img
                  src={qrImageUrl}
                  alt={`QR for ${qrLotId}`}
                  style={{
                    width: "240px",
                    height: "240px",
                    objectFit: "contain"
                  }}
                />

              ) : (

                <div
                  style={{
                    color: "#c62828"
                  }}
                >
                  QR could not be loaded.
                </div>

              )}

            </div>


            <div
              style={{
                background: "#f8faf8",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "18px",
                wordBreak: "break-word"
              }}
            >
              <strong>
                {qrLotId}
              </strong>
            </div>


            <div
              style={{
                display: "flex",
                gap: "10px"
              }}
            >

              <button
                type="button"
                onClick={handleDownloadQR}
                disabled={!qrImageUrl}
                style={{
                  flex: 1,
                  padding: "11px",
                  border: "none",
                  borderRadius: "9px",
                  background:
                    qrImageUrl
                      ? "#1b7f3a"
                      : "#b7bdb9",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor:
                    qrImageUrl
                      ? "pointer"
                      : "not-allowed"
                }}
              >
                Download QR
              </button>


              <button
                type="button"
                onClick={handleCloseQR}
                style={{
                  flex: 1,
                  padding: "11px",
                  border:
                    "1px solid #d5d9d6",
                  borderRadius: "9px",
                  background: "#ffffff",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


// ==========================================================
// LOT CARD
// ==========================================================

function LotCard({
  lot,
  onSell,
  onShowQR,
  selling
}) {

  const status =
    lot.status || "created";

  const cannotSell = [
    "sale_requested",
    "recyclers_notified",
    "offer_received",
    "offer_accepted",
    "handover_pending",
    "handed_over",
    "received",
    "processing",
    "recycled"
  ].includes(status);


  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid #e4e9e5",
        padding: "20px"
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "15px",
          marginBottom: "16px"
        }}
      >

        <div>

          <h2
            style={{
              margin: 0,
              fontSize: "20px"
            }}
          >
            {lot.material_category ||
              "Unknown Material"}
          </h2>

          {lot.material_sub_category && (

            <p
              style={{
                margin: "5px 0 0",
                color: "#777",
                fontSize: "13px"
              }}
            >
              {lot.material_sub_category}
            </p>

          )}

        </div>


        <span
          style={{
            padding: "6px 10px",
            borderRadius: "20px",
            background:
              status === "created"
                ? "#eef4ff"
                : "#eaf5ed",
            color:
              status === "created"
                ? "#315b9e"
                : "#1b7f3a",
            fontSize: "12px",
            fontWeight: 600,
            whiteSpace: "nowrap"
          }}
        >
          {formatStatus(status)}
        </span>

      </div>


      <InfoRow
        label="Lot ID"
        value={lot.lot_id}
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
        label="Condition"
        value={
          lot.condition || "N/A"
        }
      />

      <InfoRow
        label="Location"
        value={
          lot.location || "N/A"
        }
      />

      <InfoRow
        label="Price / kg"
        value={
          lot.price_per_kg !== null &&
          lot.price_per_kg !== undefined
            ? `₹${lot.price_per_kg}`
            : "N/A"
        }
      />

      <InfoRow
        label="Estimated Value"
        value={
          lot.estimated_value !== null &&
          lot.estimated_value !== undefined
            ? `₹${lot.estimated_value}`
            : "N/A"
        }
      />


      {/* ==================================================
          QR BUTTON
         ================================================== */}

      <button
        type="button"
        onClick={onShowQR}
        style={{
          width: "100%",
          marginTop: "18px",
          border:
            "1px solid #1b7f3a",
          borderRadius: "10px",
          padding: "11px",
          background: "#ffffff",
          color: "#1b7f3a",
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        📱 View Lot QR
      </button>


      {/* ==================================================
          SELL BUTTON
         ================================================== */}

      <button
        onClick={onSell}
        disabled={
          cannotSell ||
          selling
        }
        style={{
          width: "100%",
          marginTop: "10px",
          border: "none",
          borderRadius: "10px",
          padding: "12px",
          background:
            cannotSell ||
            selling
              ? "#b7bdb9"
              : "#1b7f3a",
          color: "#ffffff",
          fontWeight: 600,
          cursor:
            cannotSell ||
            selling
              ? "not-allowed"
              : "pointer"
        }}
      >
        {selling
          ? "Sending..."
          : cannotSell
          ? "Already in Sale Process"
          : "SELL"}
      </button>

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
        padding: "6px 0",
        fontSize: "13px"
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
          wordBreak: "break-word"
        }}
      >
        {value}
      </strong>

    </div>
  );
}


// ==========================================================
// FORMAT STATUS
// ==========================================================

function formatStatus(status) {

  return status
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );

}


export default MyLots;
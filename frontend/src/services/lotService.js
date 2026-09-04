const API_BASE_URL = "http://127.0.0.1:8000";


// ======================================================
// GET AUTH TOKEN
// ======================================================

function getToken() {
  const token = localStorage.getItem(
    "access_token"
  );

  if (!token) {
    throw new Error(
      "Collector login token not found"
    );
  }

  return token;
}


// ======================================================
// COMMON RESPONSE HANDLER
// ======================================================

async function handleResponse(response) {
  let data = {};

  try {
    data = await response.json();
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
// CREATE MATERIAL LOT
// ======================================================

export async function createMaterialLot(
  materialData
) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/material/create`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },

      body: JSON.stringify(materialData)
    }
  );

  return await handleResponse(
    response
  );
}


// ======================================================
// GET MY LOTS
// ======================================================

export async function getMyLots() {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/material/my-lots`,
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  return await handleResponse(
    response
  );
}


// ======================================================
// GET ONE LOT
// ======================================================

export async function getMyLot(
  lotId
) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/material/my-lots/${encodeURIComponent(
      lotId
    )}`,
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  return await handleResponse(
    response
  );
}


// ======================================================
// VERIFY LOT
// ======================================================

export async function verifyLot(
  lotId
) {
  const response = await fetch(
    `${API_BASE_URL}/material/verify/${encodeURIComponent(
      lotId
    )}`,
    {
      method: "GET",

      headers: {
        Accept: "application/json"
      }
    }
  );

  return await handleResponse(
    response
  );
}


// ======================================================
// GET LOT QR URL
// ======================================================

export function getLotQRUrl(
  lotId
) {
  return (
    `${API_BASE_URL}/material/my-lots/` +
    `${encodeURIComponent(lotId)}/qr`
  );
}


// ======================================================
// FETCH LOT QR AS BLOB
// ======================================================

export async function getLotQR(
  lotId
) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/material/my-lots/${encodeURIComponent(
      lotId
    )}/qr`,
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    let message =
      `QR request failed (${response.status})`;

    try {
      const data =
        await response.json();

      message =
        data.detail || message;
    } catch {
      // Keep default message
    }

    throw new Error(message);
  }

  return await response.blob();
}


// ======================================================
// UPLOAD MATERIAL PHOTO
// ======================================================

export async function uploadMaterialPhoto(
  lotId,
  file
) {
  const token = getToken();

  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  const response = await fetch(
    `${API_BASE_URL}/material/my-lots/${encodeURIComponent(
      lotId
    )}/photo`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`
      },

      body: formData
    }
  );

  return await handleResponse(
    response
  );
}


// ======================================================
// GET MATERIAL PHOTO
// ======================================================

export async function getMaterialPhoto(
  lotId
) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/material/my-lots/${encodeURIComponent(
      lotId
    )}/photo`,
    {
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    let message =
      `Photo request failed (${response.status})`;

    try {
      const data =
        await response.json();

      message =
        data.detail || message;
    } catch {
      // Keep default message
    }

    throw new Error(message);
  }

  return await response.blob();
}


// ======================================================
// SELL LOT
// ======================================================

export async function sellLot(
  lotId
) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/lots/${encodeURIComponent(
      lotId
    )}/sell`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  return await handleResponse(
    response
  );
}
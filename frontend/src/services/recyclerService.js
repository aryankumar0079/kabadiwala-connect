const API_BASE_URL = "http://127.0.0.1:8000";

function getToken() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Recycler login token not found");
  }

  return token;
}

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


/* =========================================================
   EXISTING: NEARBY RECYCLERS
   ========================================================= */

export async function getNearbyRecyclers() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Collector login token not found");
  }

  const url = `${API_BASE_URL}/recycler/nearby`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  return await handleResponse(response);
}


/* =========================================================
   RECYCLER: AVAILABLE SALE REQUESTS
   ========================================================= */

export async function getSaleRequests() {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/offers/sale-requests`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  return await handleResponse(response);
}


/* =========================================================
   RECYCLER: MARK REQUEST AS VIEWED
   ========================================================= */

export async function markSaleRequestViewed(
  saleRequestId
) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/offers/sale-requests/${encodeURIComponent(
      saleRequestId
    )}/view`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  return await handleResponse(response);
}


/* =========================================================
   RECYCLER: MAKE OFFER
   ========================================================= */

export async function makeOffer(
  saleRequestId,
  offeredPricePerKg
) {
  const token = getToken();

  const url =
    `${API_BASE_URL}/offers/sale-requests/` +
    `${encodeURIComponent(saleRequestId)}/offer` +
    `?offered_price_per_kg=${encodeURIComponent(
      offeredPricePerKg
    )}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  return await handleResponse(response);
}


/* =========================================================
   RECYCLER: MY OFFERS
   ========================================================= */

export async function getMyOffers() {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/offers/my-offers`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  return await handleResponse(response);
}
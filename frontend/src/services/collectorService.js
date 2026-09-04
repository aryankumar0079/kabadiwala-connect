const API_BASE_URL = "http://127.0.0.1:8000";

export async function updateCollectorLocation(
  latitude,
  longitude
) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error(
      "Collector login token not found"
    );
  }

  const url =
    `${API_BASE_URL}/collector/location` +
    `?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}`;

  console.log("Sending location to:", url);

  const response = await fetch(url, {
    method: "PUT",

    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  console.log("Backend response:", response.status, data);

  if (!response.ok) {
    throw new Error(
      data.detail ||
      `Location update failed (${response.status})`
    );
  }

  return data;
}
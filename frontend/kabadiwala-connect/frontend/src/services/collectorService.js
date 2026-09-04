const API_BASE_URL = "http://127.0.0.1:8000";


// ======================================================
// GET AUTH TOKEN
// ======================================================

function getToken() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error(
      "Collector login token not found"
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
  const token = getToken();

  const response = await fetch(
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
// GET COLLECTOR PROFILE
// ======================================================

export async function getCollectorProfile() {
  return await apiRequest(
    "/collector/profile"
  );
}


// ======================================================
// UPDATE COLLECTOR LOCATION
// ======================================================

export async function updateCollectorLocation(
  latitude,
  longitude
) {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    throw new Error(
      "Invalid latitude or longitude"
    );
  }

  return await apiRequest(
    `/collector/location?latitude=${encodeURIComponent(
      latitude
    )}&longitude=${encodeURIComponent(
      longitude
    )}`,
    {
      method: "PUT"
    }
  );
}


// ======================================================
// GET CURRENT BROWSER LOCATION
// ======================================================

export function getCurrentBrowserLocation() {
  return new Promise(
    (resolve, reject) => {

      if (!navigator.geolocation) {
        reject(
          new Error(
            "Geolocation is not supported by this browser."
          )
        );

        return;
      }


      navigator.geolocation.getCurrentPosition(
        (position) => {

          resolve({
            latitude:
              position.coords.latitude,

            longitude:
              position.coords.longitude,

            accuracy:
              position.coords.accuracy
          });

        },

        (error) => {

          let message =
            "Unable to get your current location.";


          if (error.code === 1) {

            message =
              "Location permission was denied. Please allow location access.";

          } else if (error.code === 2) {

            message =
              "Current location is unavailable.";

          } else if (error.code === 3) {

            message =
              "Location request timed out.";
          }


          reject(
            new Error(message)
          );
        },

        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    }
  );
}


// ======================================================
// GET READABLE LOCATION FROM GEOAPIFY
// ======================================================

export async function getLocationDetails(
  latitude,
  longitude
) {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    throw new Error(
      "Invalid latitude or longitude"
    );
  }


  return await apiRequest(
    `/collector/location-details?latitude=${encodeURIComponent(
      latitude
    )}&longitude=${encodeURIComponent(
      longitude
    )}`
  );
}


// ======================================================
// DETECT + SAVE + RESOLVE LOCATION
// ======================================================

export async function detectAndSaveCollectorLocation() {

  // ----------------------------------------------------
  // 1. Get browser GPS location
  // ----------------------------------------------------

  const currentLocation =
    await getCurrentBrowserLocation();


  // ----------------------------------------------------
  // 2. Save latitude + longitude in backend
  // ----------------------------------------------------

  const savedLocation =
    await updateCollectorLocation(
      currentLocation.latitude,
      currentLocation.longitude
    );


  // ----------------------------------------------------
  // 3. Reverse geocode using backend + Geoapify
  // ----------------------------------------------------

  const locationDetails =
    await getLocationDetails(
      currentLocation.latitude,
      currentLocation.longitude
    );


  // ----------------------------------------------------
  // 4. Return complete location data
  // ----------------------------------------------------

  return {
    latitude:
      savedLocation.latitude,

    longitude:
      savedLocation.longitude,

    accuracy:
      currentLocation.accuracy,

    address:
      locationDetails.address || null,

    city:
      locationDetails.city || null,

    district:
      locationDetails.district || null,

    state:
      locationDetails.state || null,

    postcode:
      locationDetails.postcode || null,

    country:
      locationDetails.country || null
  };
}
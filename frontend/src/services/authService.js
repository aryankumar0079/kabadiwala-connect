const API_BASE_URL = "http://127.0.0.1:8000";

/**
 * Common response handler
 */
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

/**
 * Signup
 */
export async function signupUser(userData) {
  const response = await fetch(
    `${API_BASE_URL}/auth/signup`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(userData)
    }
  );

  return await handleResponse(response);
}

/**
 * Login
 */
export async function loginUser(identifier, password) {
  const response = await fetch(
    `${API_BASE_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        identifier,
        password
      })
    }
  );

  const data = await handleResponse(response);

  /**
   * Save authentication data
   */
  if (data.access_token) {
    localStorage.setItem(
      "access_token",
      data.access_token
    );
  }

  if (data.user_id !== undefined) {
    localStorage.setItem(
      "user_id",
      String(data.user_id)
    );
  }

  if (data.role) {
    localStorage.setItem(
      "user_role",
      data.role
    );
  }

  return data;
}

/**
 * Logout
 */
export function logoutUser() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_role");
}

/**
 * Get saved token
 */
export function getAuthToken() {
  return localStorage.getItem("access_token");
}

/**
 * Get saved user role
 */
export function getUserRole() {
  return localStorage.getItem("user_role");
}

/**
 * Check whether user is logged in
 */
export function isAuthenticated() {
  const token = localStorage.getItem("access_token");

  return Boolean(token);
}
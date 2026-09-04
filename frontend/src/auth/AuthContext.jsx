import { createContext, useContext, useEffect, useState } from "react";

import {
  loginUser,
  logoutUser,
  getAuthToken,
  getUserRole
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Check existing login when app starts
   */
  useEffect(() => {
    const token = getAuthToken();
    const role = getUserRole();
    const userId = localStorage.getItem("user_id");

    if (token && role) {
      setUser({
        user_id: userId ? Number(userId) : null,
        role: role
      });
    }

    setLoading(false);
  }, []);

  /**
   * Login
   */
  async function login(identifier, password) {
    const data = await loginUser(
      identifier,
      password
    );

    const loggedInUser = {
      user_id: data.user_id,
      role: data.role
    };

    setUser(loggedInUser);

    return data;
  }

  /**
   * Logout
   */
  function logout() {
    logoutUser();
    setUser(null);
  }

  /**
   * Authentication status
   */
  const isAuthenticated = Boolean(
    getAuthToken() && user
  );

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}

export default AuthContext;
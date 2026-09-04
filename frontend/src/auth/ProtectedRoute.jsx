import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

function ProtectedRoute({ allowedRoles }) {
  const {
    user,
    loading,
    isAuthenticated
  } = useAuth();

  // Authentication status check ho raha hai
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px"
        }}
      >
        Loading...
      </div>
    );
  }

  // User logged in nahi hai
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Agar route specific roles allow karta hai
  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    // User ko uske role ke dashboard par bhejo
    if (user.role === "collector") {
      return (
        <Navigate
          to="/collector/dashboard"
          replace
        />
      );
    }

    if (user.role === "recycler") {
      return (
        <Navigate
          to="/recycler/dashboard"
          replace
        />
      );
    }

    if (user.role === "admin") {
      return (
        <Navigate
          to="/admin/dashboard"
          replace
        />
      );
    }

    // Unknown role
    return <Navigate to="/login" replace />;
  }

  // Sab sahi hai → requested page open karo
  return <Outlet />;
}

export default ProtectedRoute;
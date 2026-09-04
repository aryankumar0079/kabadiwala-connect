import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Landing from "../pages/auth/Landing";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import VerifyOTP from "../pages/auth/VerifyOTP";
import ForgotPassword from "../pages/auth/ForgotPassword";

import ProtectedRoute from "../auth/ProtectedRoute";

import CollectorDashboard from "../pages/collector/Dashboard";
import MyLots from "../pages/collector/MyLots";

import RecyclerDashboard from "../pages/recycler/Dashboard";

import AdminDashboard from "../pages/admin/Dashboard";


function AppRoutes() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =================================================
            PUBLIC ROUTES
           ================================================= */}

        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/verify-otp"
          element={<VerifyOTP />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />


        {/* =================================================
            COLLECTOR PROTECTED ROUTES
           ================================================= */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["collector"]}
            />
          }
        >

          <Route
            path="/collector/dashboard"
            element={<CollectorDashboard />}
          />

          <Route
            path="/collector/my-lots"
            element={<MyLots />}
          />

        </Route>


        {/* =================================================
            RECYCLER PROTECTED ROUTES
           ================================================= */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["recycler"]}
            />
          }
        >

          <Route
            path="/recycler/dashboard"
            element={<RecyclerDashboard />}
          />

        </Route>


        {/* =================================================
            ADMIN PROTECTED ROUTES
           ================================================= */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["admin"]}
            />
          }
        >

          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

        </Route>


        {/* =================================================
            UNKNOWN ROUTE
           ================================================= */}

        <Route
          path="*"
          element={<Landing />}
        />

      </Routes>

    </BrowserRouter>
  );
}


export default AppRoutes;
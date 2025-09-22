import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import PartnerDashboard from "./pages/PartnerDashboard";
import Signup from "./pages/Signup";
import AdminRoute from "./components/AdminRoute";
import InviteManager from "./pages/admin/InviteManager";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import RewardsManagement from "./pages/admin/RewardsManagement";
import BonusPage from "./pages/BonusPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/invites"
          element={
            <AdminRoute>
              <InviteManager />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/rewards"
          element={
            <AdminRoute>
              <RewardsManagement />
            </AdminRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <PartnerDashboard />
            </PrivateRoute>
          }
        />
        {/* Public bonus page - no authentication required */}
        <Route path="/bonus" element={<BonusPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

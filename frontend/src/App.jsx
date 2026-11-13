import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import AssetOperations from "./pages/AssetOperations";
import AdminEmployees from "./pages/AdminEmployees";
import MaintenanceTransfers from "./pages/MaintenanceTransfers";
import Reporting from "./pages/Reporting";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/asset-operations" element={<ProtectedRoute roles={["ASSET_MANAGER", "ADMIN"]} />} >
                <Route index element={<AssetOperations />} />
              </Route>
              <Route path="/maintenance" element={<MaintenanceTransfers />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/reports" element={<ProtectedRoute roles={["ASSET_MANAGER", "ADMIN"]} />}>
                <Route index element={<Reporting />} />
              </Route>
              <Route path="/admin/employees" element={<ProtectedRoute roles={["ADMIN"]} />}>
                <Route index element={<AdminEmployees />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
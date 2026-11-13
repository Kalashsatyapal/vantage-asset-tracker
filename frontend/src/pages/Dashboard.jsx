import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

function Metric({ label, value, description }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
      <small>{description}</small>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const manager = ["ASSET_MANAGER", "ADMIN"].includes(user?.role);

  const [dashboard, setDashboard] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        if (manager) {
          const response = await api.get("/asset-management/dashboard");
          setDashboard(response.data.dashboard);
        } else {
          const response = await api.get("/assets/my/summary");
          setSummary(response.data.summary);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Dashboard data could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [manager]);

  if (loading) {
    return <div className="loading-screen">Loading dashboard...</div>;
  }

  const metrics = manager ? dashboard : summary;

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">OVERVIEW</span>
          <h1>Good day, {user?.firstName}.</h1>
          <p>Here is your enterprise asset overview.</p>
        </div>
        <span className="role-chip">{user?.role?.replaceAll("_", " ")}</span>
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      <div className="metrics-grid">
        {metrics && Object.entries(metrics)
          .filter(([, value]) => typeof value === "number" || typeof value === "string")
          .slice(0, 8)
          .map(([key, value]) => (
            <Metric
              key={key}
              label={key.replace(/([A-Z])/g, " $1").replaceAll("_", " ")}
              value={value}
              description="Current recorded value"
            />
          ))}
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <div>
            <span className="eyebrow">ACCOUNT</span>
            <h3>Workspace information</h3>
          </div>
        </div>

        <div className="profile-grid">
          <div>
            <span>Employee code</span>
            <strong>{user?.employeeCode || "—"}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{user?.email || "—"}</strong>
          </div>
          <div>
            <span>Role</span>
            <strong>{user?.role || "—"}</strong>
          </div>
          <div>
            <span>Department ID</span>
            <strong>{user?.departmentId || "—"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
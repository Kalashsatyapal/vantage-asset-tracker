import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Assets() {
  const { user } = useAuth();
  const manager = ["ASSET_MANAGER", "ADMIN"].includes(user?.role);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadAssets = async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint = manager
        ? "/asset-management/assets"
        : "/assets/available";

      const response = await api.get(endpoint, {
        params: { search, page: 1, limit: 50 }
      });

      const records = response.data.assets || response.data.rows || [];
      setAssets(records);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">INVENTORY</span>
          <h1>{manager ? "Asset inventory" : "Available assets"}</h1>
          <p>View and track enterprise equipment.</p>
        </div>
        <button className="secondary-button" onClick={loadAssets}>
          Refresh
        </button>
      </div>

      <div className="content-card">
        <div className="toolbar">
          <input
            className="form-control search-input"
            placeholder="Search assets..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && loadAssets()}
          />
          <button className="primary-button" onClick={loadAssets}>
            Search
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="empty-state">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className="empty-state">No assets found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table asset-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Serial number</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <strong>{asset.assetTag || asset.name || asset.id}</strong>
                    </td>
                    <td>{asset.serialNumber || "—"}</td>
                    <td>{asset.category?.name || asset.categoryName || "—"}</td>
                    <td><span className="status-chip">{asset.status || "—"}</span></td>
                    <td>{asset.condition || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
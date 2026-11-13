import { useState } from "react";
import api from "../api/client";

export default function Reporting() {
  const [dates, setDates] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [overdue, setOverdue] = useState([]);

  const downloadReport = async (type) => {
    setLoading(type);
    setError("");
    setMessage("");

    try {
      const params = type === "audit-logs"
        ? { from: dates.from || undefined, to: dates.to || undefined }
        : undefined;

      const response = await api.get(`/reporting/exports/${type}`, {
        params,
        responseType: "blob"
      });

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `vantage-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setMessage(`${type} report downloaded.`);
    } catch (err) {
      setError("Unable to download the report. Check your access permissions and backend logs.");
    } finally {
      setLoading("");
    }
  };

  const loadOverdue = async () => {
    setError("");

    try {
      const response = await api.get("/reporting/overdue", {
        params: { page: 1, limit: 100 }
      });

      setOverdue(response.data.allocations || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load overdue allocations.");
    }
  };

  const processOverdue = async () => {
    if (!window.confirm("Process overdue allocations and create notifications?")) return;

    try {
      const response = await api.post("/reporting/overdue/process");
      setMessage(`${response.data.processed || 0} overdue allocations processed.`);
      await loadOverdue();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to process overdue allocations.");
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BUSINESS INTELLIGENCE</span>
          <h1>Reports and exports</h1>
          <p>Download asset, allocation and audit records.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="report-grid">
        <div className="content-card report-card">
          <span className="report-icon">01</span>
          <h3>Asset register</h3>
          <p>Export asset tags, serial numbers, categories, departments, values and lifecycle status.</p>
          <button className="primary-button" disabled={!!loading} onClick={() => downloadReport("assets")}>
            {loading === "assets" ? "Preparing..." : "Download assets CSV"}
          </button>
        </div>

        <div className="content-card report-card">
          <span className="report-icon">02</span>
          <h3>Asset allocations</h3>
          <p>Export employee assignments, allocation dates, expected returns and allocation status.</p>
          <button className="primary-button" disabled={!!loading} onClick={() => downloadReport("allocations")}>
            {loading === "allocations" ? "Preparing..." : "Download allocations CSV"}
          </button>
        </div>

        <div className="content-card report-card">
          <span className="report-icon">03</span>
          <h3>Audit history</h3>
          <p>Export administrative and asset lifecycle audit records for a selected date range.</p>
          <label>From<input className="form-control" type="date" value={dates.from} onChange={(event) => setDates({ ...dates, from: event.target.value })} /></label>
          <label>To<input className="form-control" type="date" value={dates.to} onChange={(event) => setDates({ ...dates, to: event.target.value })} /></label>
          <button className="primary-button" disabled={!!loading} onClick={() => downloadReport("audit-logs")}>
            {loading === "audit-logs" ? "Preparing..." : "Download audit CSV"}
          </button>
        </div>
      </div>

      <div className="content-card operation-card">
        <div className="content-card-header">
          <span className="eyebrow">RETURN COMPLIANCE</span>
          <h3>Overdue allocations</h3>
        </div>

        <div className="operation-actions">
          <button className="secondary-button" onClick={loadOverdue}>Load overdue records</button>
          <button className="primary-button" onClick={processOverdue}>Process overdue allocations</button>
        </div>

        <div className="table-responsive">
          <table className="table asset-table">
            <thead><tr><th>Asset</th><th>Employee</th><th>Expected return</th><th>Status</th></tr></thead>
            <tbody>
              {overdue.map((item) => (
                <tr key={item.id}>
                  <td>{item.asset?.assetTag || "—"} — {item.asset?.name || ""}</td>
                  <td>{item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : "—"}</td>
                  <td>{item.expectedReturnDate ? new Date(item.expectedReturnDate).toLocaleDateString() : "—"}</td>
                  <td><span className="status-chip">{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!overdue.length && <div className="empty-state">Load overdue records to view the current list.</div>}
        </div>
      </div>
    </div>
  );
}
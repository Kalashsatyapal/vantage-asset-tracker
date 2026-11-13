import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const scheduleInitial = {
  assetId: "",
  title: "",
  description: "",
  maintenanceType: "PREVENTATIVE",
  frequencyDays: 30,
  nextMaintenanceAt: "",
  assignedTo: ""
};

export default function MaintenanceTransfers() {
  const { user } = useAuth();
  const manager = ["ASSET_MANAGER", "ADMIN"].includes(user?.role);

  const [tickets, setTickets] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [ticketUpdates, setTicketUpdates] = useState({});
  const [schedule, setSchedule] = useState(scheduleInitial);
  const [transfer, setTransfer] = useState({
    assetId: "",
    toDepartmentId: "",
    requestReason: ""
  });
  const [decision, setDecision] = useState({
    transferId: "",
    decision: "APPROVE",
    rejectionReason: ""
  });
  const [departments, setDepartments] = useState([]);
  const [damage, setDamage] = useState({
    assetId: "",
    title: "",
    description: "",
    priority: "MEDIUM",
    issueType: "HARDWARE"
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setError("");

    try {
      if (manager) {
        const [ticketResponse, scheduleResponse, assetResponse, departmentResponse] =
          await Promise.all([
            api.get("/assets/maintenance/tickets"),
            api.get("/asset-management/maintenance-schedules"),
            api.get("/asset-management/assets", { params: { page: 1, limit: 100 } }),
            api.get("/asset-management/master/departments")
          ]);

        setTickets(ticketResponse.data.tickets || []);
        setSchedules(scheduleResponse.data.schedules || []);
        setAssets(assetResponse.data.assets || []);
        setDepartments(departmentResponse.data.records || []);
      } else {
        const [assetResponse, historyResponse] = await Promise.all([
          api.get("/assets/my/history"),
          api.get("/assets/my/summary")
        ]);

        setAssets(
          (historyResponse.data.history || [])
            .map((item) => item.asset)
            .filter(Boolean)
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load maintenance information.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitDamage = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post(`/assets/${damage.assetId}/damage-reports`, {
        title: damage.title,
        description: damage.description,
        priority: damage.priority,
        issueType: damage.issueType
      });

      setDamage({ assetId: "", title: "", description: "", priority: "MEDIUM", issueType: "HARDWARE" });
      setMessage("Maintenance ticket submitted.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit maintenance ticket.");
    }
  };

  const saveTicket = async (ticketId) => {
    const update = ticketUpdates[ticketId] || {};

    try {
      await api.patch(`/assets/maintenance/tickets/${ticketId}`, update);
      setMessage("Maintenance ticket updated.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update maintenance ticket.");
    }
  };

  const createSchedule = async (event) => {
    event.preventDefault();

    try {
      await api.post("/asset-management/maintenance-schedules", {
        ...schedule,
        frequencyDays: Number(schedule.frequencyDays),
        assignedTo: schedule.assignedTo || null
      });

      setSchedule(scheduleInitial);
      setMessage("Maintenance schedule created.");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create maintenance schedule.");
    }
  };

  const submitTransfer = async (event) => {
    event.preventDefault();

    try {
      await api.post("/employee-operations/transfers", transfer);
      setTransfer({ assetId: "", toDepartmentId: "", requestReason: "" });
      setMessage("Transfer request submitted.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit transfer request.");
    }
  };

  const decideTransfer = async (event) => {
    event.preventDefault();

    try {
      await api.patch(`/employee-operations/transfers/${decision.transferId}/decision`, {
        decision: decision.decision,
        rejectionReason: decision.rejectionReason
      });

      setDecision({ transferId: "", decision: "APPROVE", rejectionReason: "" });
      setMessage("Transfer decision submitted.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to process transfer.");
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LIFECYCLE OPERATIONS</span>
          <h1>Maintenance and transfers</h1>
          <p>Manage maintenance work and departmental asset movement.</p>
        </div>
        <button className="secondary-button" onClick={loadData}>Refresh</button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {!manager && (
        <>
          <div className="content-card operation-card">
            <div className="content-card-header">
              <span className="eyebrow">MAINTENANCE REQUEST</span>
              <h3>Report an asset problem</h3>
            </div>

            <form onSubmit={submitDamage}>
              <div className="operation-grid">
                <label>Asset
                  <select className="form-select" value={damage.assetId} onChange={(event) => setDamage({ ...damage, assetId: event.target.value })} required>
                    <option value="">Select your asset</option>
                    {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetTag} — {asset.name}</option>)}
                  </select>
                </label>
                <label>Issue type
                  <select className="form-select" value={damage.issueType} onChange={(event) => setDamage({ ...damage, issueType: event.target.value })}>
                    {["HARDWARE", "SOFTWARE", "NETWORK", "OTHER"].map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label>Priority
                  <select className="form-select" value={damage.priority} onChange={(event) => setDamage({ ...damage, priority: event.target.value })}>
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label>Title<input className="form-control" value={damage.title} onChange={(event) => setDamage({ ...damage, title: event.target.value })} required minLength="3" /></label>
                <label className="operation-full">Description<textarea className="form-control" rows="3" value={damage.description} onChange={(event) => setDamage({ ...damage, description: event.target.value })} required minLength="5" /></label>
              </div>
              <div className="operation-actions"><button className="primary-button">Submit maintenance request</button></div>
            </form>
          </div>

          <div className="content-card operation-card">
            <div className="content-card-header">
              <span className="eyebrow">DEPARTMENT TRANSFER</span>
              <h3>Request asset transfer</h3>
            </div>

            <form onSubmit={submitTransfer}>
              <div className="operation-grid">
                <label>Asset
                  <select className="form-select" value={transfer.assetId} onChange={(event) => setTransfer({ ...transfer, assetId: event.target.value })} required>
                    <option value="">Select asset</option>
                    {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetTag} — {asset.name}</option>)}
                  </select>
                </label>
                <label>Destination department ID<input className="form-control" value={transfer.toDepartmentId} onChange={(event) => setTransfer({ ...transfer, toDepartmentId: event.target.value })} required /></label>
                <label className="operation-full">Reason<textarea className="form-control" rows="3" value={transfer.requestReason} onChange={(event) => setTransfer({ ...transfer, requestReason: event.target.value })} required minLength="5" /></label>
              </div>
              <div className="operation-actions"><button className="primary-button">Submit transfer request</button></div>
            </form>
          </div>
        </>
      )}

      {manager && (
        <>
          <div className="content-card operation-card">
            <div className="content-card-header">
              <span className="eyebrow">MAINTENANCE PLANNING</span>
              <h3>Create maintenance schedule</h3>
            </div>

            <form onSubmit={createSchedule}>
              <div className="operation-grid">
                <label>Asset
                  <select className="form-select" value={schedule.assetId} onChange={(event) => setSchedule({ ...schedule, assetId: event.target.value })} required>
                    <option value="">Select asset</option>
                    {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetTag} — {asset.name}</option>)}
                  </select>
                </label>
                <label>Title<input className="form-control" value={schedule.title} onChange={(event) => setSchedule({ ...schedule, title: event.target.value })} required /></label>
                <label>Maintenance type
                  <select className="form-select" value={schedule.maintenanceType} onChange={(event) => setSchedule({ ...schedule, maintenanceType: event.target.value })}>
                    {["PREVENTATIVE", "INSPECTION", "CALIBRATION", "CLEANING", "UPGRADE"].map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label>Frequency in days<input className="form-control" type="number" min="1" value={schedule.frequencyDays} onChange={(event) => setSchedule({ ...schedule, frequencyDays: event.target.value })} required /></label>
                <label>Next maintenance date<input className="form-control" type="date" value={schedule.nextMaintenanceAt} onChange={(event) => setSchedule({ ...schedule, nextMaintenanceAt: event.target.value })} required /></label>
                <label>Assignee employee ID<input className="form-control" value={schedule.assignedTo} onChange={(event) => setSchedule({ ...schedule, assignedTo: event.target.value })} /></label>
                <label className="operation-full">Description<textarea className="form-control" rows="2" value={schedule.description} onChange={(event) => setSchedule({ ...schedule, description: event.target.value })} /></label>
              </div>
              <div className="operation-actions"><button className="primary-button">Create schedule</button></div>
            </form>
          </div>

          <div className="content-card operation-card">
            <div className="content-card-header">
              <span className="eyebrow">MAINTENANCE WORKFLOW</span>
              <h3>Maintenance tickets</h3>
            </div>

            <div className="table-responsive">
              <table className="table asset-table">
                <thead>
                  <tr><th>Ticket</th><th>Asset</th><th>Priority</th><th>Status</th><th>Assignee ID</th><th>Update</th></tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => {
                    const update = ticketUpdates[ticket.id] || {};
                    return (
                      <tr key={ticket.id}>
                        <td><strong>{ticket.ticketNumber}</strong><br />{ticket.title}</td>
                        <td>{ticket.asset?.assetTag || ticket.assetId}</td>
                        <td>
                          <select className="form-select table-select" value={update.priority ?? ticket.priority} onChange={(event) => setTicketUpdates({ ...ticketUpdates, [ticket.id]: { ...update, priority: event.target.value } })}>
                            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => <option key={value}>{value}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-select table-select" value={update.status ?? ticket.status} onChange={(event) => setTicketUpdates({ ...ticketUpdates, [ticket.id]: { ...update, status: event.target.value } })}>
                            {["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED", "CANCELLED"].map((value) => <option key={value}>{value}</option>)}
                          </select>
                        </td>
                        <td><input className="form-control table-input" value={update.assignedTo ?? ticket.assignedTo ?? ""} onChange={(event) => setTicketUpdates({ ...ticketUpdates, [ticket.id]: { ...update, assignedTo: event.target.value || null } })} /></td>
                        <td><button className="table-action" onClick={() => saveTicket(ticket.id)}>Save</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!tickets.length && <div className="empty-state">No maintenance tickets found.</div>}
            </div>
          </div>

          <div className="content-card operation-card">
            <div className="content-card-header">
              <span className="eyebrow">SCHEDULES</span>
              <h3>Maintenance schedules</h3>
            </div>

            <div className="table-responsive">
              <table className="table asset-table">
                <thead><tr><th>Title</th><th>Asset</th><th>Type</th><th>Next date</th><th>Frequency</th><th>Status</th></tr></thead>
                <tbody>
                  {schedules.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.asset?.assetTag || item.assetId}</td>
                      <td>{item.maintenanceType}</td>
                      <td>{item.nextMaintenanceAt ? new Date(item.nextMaintenanceAt).toLocaleDateString() : "—"}</td>
                      <td>{item.frequencyDays} days</td>
                      <td><span className="status-chip">{item.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!schedules.length && <div className="empty-state">No maintenance schedules found.</div>}
            </div>
          </div>

          <div className="content-card operation-card">
            <div className="content-card-header">
              <span className="eyebrow">TRANSFER APPROVAL</span>
              <h3>Process transfer by request ID</h3>
            </div>

            <form onSubmit={decideTransfer}>
              <div className="operation-grid">
                <label>Transfer request ID<input className="form-control" value={decision.transferId} onChange={(event) => setDecision({ ...decision, transferId: event.target.value })} required /></label>
                <label>Decision
                  <select className="form-select" value={decision.decision} onChange={(event) => setDecision({ ...decision, decision: event.target.value })}>
                    <option value="APPROVE">Approve</option>
                    <option value="REJECT">Reject</option>
                  </select>
                </label>
                <label className="operation-full">Rejection reason<textarea className="form-control" value={decision.rejectionReason} onChange={(event) => setDecision({ ...decision, rejectionReason: event.target.value })} /></label>
              </div>
              <div className="operation-actions"><button className="primary-button">Submit decision</button></div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
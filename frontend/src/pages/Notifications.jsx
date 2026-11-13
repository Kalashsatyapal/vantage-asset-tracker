import { useEffect, useState } from "react";
import api from "../api/client";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      const response = await api.get("/employee-operations/notifications");
      setNotifications(response.data.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/employee-operations/notifications/${id}/read`);
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, isRead: true } : item
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update notification.");
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACTIVITY</span>
          <h1>Notifications</h1>
          <p>Updates and alerts from your workspace.</p>
        </div>
      </div>

      <div className="content-card">
        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="empty-state">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">You have no notifications.</div>
        ) : (
          <div className="notification-list">
            {notifications.map((item) => (
              <div className="notification-item" key={item.id}>
                <div className="notification-indicator"></div>
                <div className="notification-content">
                  <strong>{item.title || item.type || "Notification"}</strong>
                  <p>{item.message || "You have a new update."}</p>
                  <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</span>
                </div>
                {!item.isRead && (
                  <button
                    className="secondary-button"
                    onClick={() => markRead(item.id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
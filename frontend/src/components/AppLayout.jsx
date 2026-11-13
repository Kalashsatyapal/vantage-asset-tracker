import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const manager = ["ASSET_MANAGER", "ADMIN"].includes(user?.role);
  const admin = user?.role === "ADMIN";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <strong>VANTAGE</strong>
            <span>ASSET INTELLIGENCE</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard">Overview</NavLink>
          <NavLink to="/assets">Assets</NavLink>
          {manager && <NavLink to="/asset-operations">Asset operations</NavLink>}
          <NavLink to="/maintenance">Maintenance & transfers</NavLink>
          <NavLink to="/notifications">Notifications</NavLink>
          <NavLink to="/profile">My profile</NavLink>
          {manager && <NavLink to="/reports">Reports & exports</NavLink>}
          {admin && <NavLink to="/admin/employees">Employee management</NavLink>}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="avatar">{user?.firstName?.charAt(0)}</div>
            <div className="user-info">
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>{user?.role?.replaceAll("_", " ")}</span>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="topbar-label">ENTERPRISE WORKSPACE</span>
            <h2>Asset Management Platform</h2>
          </div>
          <div className="topbar-status">
            <span className="status-dot"></span>
            System workspace
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
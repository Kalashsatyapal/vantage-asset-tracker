import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to sign in. Check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="brand login-brand">
          <div className="brand-mark">V</div>
          <div>
            <strong>VANTAGE</strong>
            <span>ASSET INTELLIGENCE</span>
          </div>
        </div>

        <div className="login-heading">
          <span className="eyebrow">SECURE ACCESS</span>
          <h1>Welcome back.</h1>
          <p>Sign in to access your enterprise workspace.</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email address</label>
          <input
            type="email"
            className="form-control"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="password-label">Password</label>
          <input
            type="password"
            className="form-control"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button className="login-button" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in to workspace"}
          </button>
        </form>

        <div className="login-footer">
          Protected enterprise access · Vantage
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await apiRequest("/auth/forgot-password", "POST", { email });
      setMessage("OTP sent to your email for password reset!");
      setTimeout(() => navigate("/reset-password"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-auth-layout">
      <div className="ds-mb-lg" style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '0.05em' }}>
        PrivGuard
      </div>

      <div className="ds-card auth-card-wrapper ds-card-body">
        <h2 className="ds-heading-1 ds-mb-sm">Forgot Password</h2>
        <p className="ds-text-body ds-mb-lg">Enter your email to receive an OTP</p>
        
        {error && <div className="ds-alert ds-alert-error ds-mb-md">{error}</div>}
        {message && <div className="ds-alert ds-alert-info ds-mb-md" style={{ background: 'var(--bg-secondary)', color: 'var(--color-compliant)', borderLeft: '4px solid var(--color-compliant)' }}>{message}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="ds-form-group">
            <label className="ds-label">Email</label>
            <input
              className="ds-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <button type="submit" className="ds-btn ds-btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
        <div className="ds-mt-lg ds-text-center ds-text-small ds-text-secondary">
          Remember your password? <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Login</Link>
        </div>
      </div>
    </div>
  );
}
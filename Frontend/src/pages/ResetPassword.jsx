import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/api";
import Logo from "../components/Logo";

export default function ResetPassword() {
  const [formData, setFormData] = useState({ email: "", otp: "", newPassword: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await apiRequest("/auth/reset-password", "POST", formData);
      setMessage("Password reset successfully! You can now login.");
      setTimeout(() => navigate("/login"), 2000);
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
        <h2 className="ds-heading-1 ds-mb-sm">Reset Password</h2>
        <p className="ds-text-body ds-mb-lg">Enter the OTP and your new password</p>
        
        {error && <div className="ds-alert ds-alert-error ds-mb-md">{error}</div>}
        {message && <div className="ds-alert ds-alert-info ds-mb-md" style={{ background: 'var(--bg-secondary)', color: 'var(--color-compliant)', borderLeft: '4px solid var(--color-compliant)' }}>{message}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="ds-form-group">
            <label className="ds-label">Email</label>
            <input
              className="ds-input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="ds-form-group">
            <label className="ds-label">OTP</label>
            <input
              className="ds-input"
              type="text"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              placeholder="Enter 6-digit OTP"
              maxLength="6"
              required
            />
          </div>
          <div className="ds-form-group">
            <label className="ds-label">New Password</label>
            <input
              className="ds-input"
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password"
              required
            />
          </div>
          <button type="submit" className="ds-btn ds-btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
        <div className="ds-mt-lg ds-text-center ds-text-small ds-text-secondary">
          <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
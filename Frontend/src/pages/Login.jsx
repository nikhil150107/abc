import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/api";

export default function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const { login }   = useAuth();
  const navigate    = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest("/auth/login", "POST", formData);
      login(data.accessToken, data.user);
      navigate("/dashboard");
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
        <h1 className="ds-heading-1 ds-mb-sm">Welcome back.</h1>

        {error && <div className="ds-alert ds-alert-error ds-mb-md">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="ds-form-group">
            <label className="ds-label">Username</label>
            <input className="ds-input" name="username" type="text" placeholder="Enter your username"
              value={formData.username} onChange={handleChange} required />
          </div>

          <div className="ds-form-group">
            <div className="ds-flex-between ds-mb-sm">
              <label className="ds-label" style={{ marginBottom: 0 }}>Password</label>
              <Link to="/forgot-password" className="ds-text-small ds-text-secondary" style={{ textDecoration: 'underline' }}>Forgot password?</Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input className="ds-input" name="password" type={showPw ? "text" : "password"} placeholder="••••••••••••"
                value={formData.password} onChange={handleChange} required style={{ paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '12px', top: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: '600' }}>
                {showPw ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          <button type="submit" className="ds-btn ds-btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="ds-mt-lg ds-text-center ds-text-small ds-text-secondary">
          Don't have an account? <Link to="/register" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}

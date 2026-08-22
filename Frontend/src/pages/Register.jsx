import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/api";

export default function Register() {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("/auth/register", "POST", formData);
      navigate("/verify-otp", { state: { email: formData.email } });
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
        <h1 className="ds-heading-1 ds-mb-sm">Create your workspace.</h1>

        {error && <div className="ds-alert ds-alert-error ds-mb-md">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="ds-form-group">
            <label className="ds-label">Username</label>
            <input className="ds-input" name="username" type="text" placeholder="yourname"
              value={formData.username} onChange={handleChange} required />
          </div>

          <div className="ds-form-group">
            <label className="ds-label">Email</label>
            <input className="ds-input" name="email" type="email" placeholder="name@company.com"
              value={formData.email} onChange={handleChange} required />
          </div>

          <div className="ds-form-group">
            <label className="ds-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input className="ds-input" name="password" type={showPw ? "text" : "password"} placeholder="••••••••••••"
                value={formData.password} onChange={handleChange} required style={{ paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '12px', top: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: '600' }}>
                {showPw ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          <button type="submit" className="ds-btn ds-btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="ds-mt-lg ds-text-center ds-text-small ds-text-secondary">
          Already have an account? <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}

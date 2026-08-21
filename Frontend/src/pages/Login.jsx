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
    <div className="auth-container">
      <div className="auth-logo">
        <div className="auth-logo-mark">◇</div>
        <span className="auth-logo-name">PrivGuard</span>
      </div>

      <div className="auth-card">
        <h1 className="auth-heading">Welcome back.</h1>
        <p className="auth-subtitle">Sign in to your privacy workspace.</p>

        <div className="alert alert-info" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
          🔑 Demo credentials: <b>admin</b> / <b>Admin@123</b>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input name="username" type="text" placeholder="Enter your username"
              value={formData.username} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <input name="password" type={showPw ? "text" : "password"} placeholder="••••••••••••"
                value={formData.password} onChange={handleChange} required />
              <button type="button" className="input-eye" onClick={() => setShowPw(!showPw)}>
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className="form-row-between">
            <Link to="/forgot-password" className="link-subtle">Forgot password?</Link>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="auth-links">
          <p>Don't have an account? <Link to="/register">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}

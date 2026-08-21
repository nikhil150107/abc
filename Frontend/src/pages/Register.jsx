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
      navigate("/verify-otp");
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
        <h1 className="auth-heading">Create your workspace.</h1>
        <p className="auth-subtitle">Start monitoring your application's privacy behavior.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input name="username" type="text" placeholder="yourname"
              value={formData.username} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" placeholder="name@company.com"
              value={formData.email} onChange={handleChange} required />
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

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="auth-links">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

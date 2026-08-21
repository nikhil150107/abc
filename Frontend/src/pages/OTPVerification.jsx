import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/api";

export default function OTPVerification() {
  const [email, setEmail]       = useState("");
  const [digits, setDigits]     = useState(Array(6).fill(""));
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const navigate  = useNavigate();

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < 6) { setError("Please enter all 6 digits."); return; }
    setError("");
    setLoading(true);
    try {
      await apiRequest("/auth/verify-otp", "POST", { email, otp });
      setVerified(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) { setError("Enter your email first."); return; }
    setError("");
    setLoading(true);
    try {
      await apiRequest("/auth/resend-otp", "POST", { email });
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="auth-container">
      <div className="auth-logo">
        <div className="auth-logo-mark">◇</div>
        <span className="auth-logo-name">PrivGuard</span>
      </div>

      <div className="auth-card">
        {verified ? (
          <div className="auth-success">
            <div className="success-icon">✓</div>
            <div className="success-title">Email verified</div>
            <p className="success-sub">Your workspace is ready. Redirecting to sign in…</p>
          </div>
        ) : (
          <>
            <h1 className="auth-heading" style={{ fontSize: 28 }}>Verify your email</h1>
            <p className="auth-subtitle">We sent a 6-digit code to your email address.</p>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="name@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <p className="otp-email-hint">Enter the code below</p>

            <form onSubmit={handleVerify}>
              <div className="otp-boxes" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input key={i} ref={el => inputRefs.current[i] = el}
                    className="otp-box" type="text" inputMode="numeric"
                    maxLength={1} value={d}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)} />
                ))}
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Verifying…" : "Verify"}
              </button>
            </form>

            <div className="otp-resend">
              {canResend ? (
                <button className="btn-link" onClick={handleResend} disabled={loading}>
                  Resend code
                </button>
              ) : (
                <>Resend code in <b>{fmt(countdown)}</b></>
              )}
            </div>

            <div className="auth-links">
              <p><Link to="/register">← Back to sign up</Link></p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

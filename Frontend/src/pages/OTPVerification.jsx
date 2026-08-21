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
    <div className="ds-auth-layout">
      <div className="ds-mb-lg" style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '0.05em' }}>
        PrivGuard
      </div>

      <div className="ds-card auth-card-wrapper ds-card-body">
        {verified ? (
          <div className="ds-text-center">
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-compliant)', color: 'var(--color-compliant)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: '700' }}>✓</div>
            <h1 className="ds-heading-2 ds-mb-sm">Email verified</h1>
            <p className="ds-text-body">Your workspace is ready. Redirecting to sign in…</p>
          </div>
        ) : (
          <>
            <h1 className="ds-heading-1 ds-mb-sm">Verify your email</h1>
            <p className="ds-text-body ds-mb-lg">We sent a 6-digit code to your email address.</p>

            {error && <div className="ds-alert ds-alert-error ds-mb-md">{error}</div>}

            <div className="ds-form-group">
              <label className="ds-label">Email</label>
              <input className="ds-input" type="email" placeholder="name@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <p className="ds-text-small ds-font-medium ds-mb-sm">Enter the code below</p>

            <form onSubmit={handleVerify}>
              <div className="ds-flex ds-gap-sm ds-mb-lg" onPaste={handlePaste} style={{ justifyContent: 'space-between' }}>
                {digits.map((d, i) => (
                  <input key={i} ref={el => inputRefs.current[i] = el}
                    className="ds-input" style={{ width: '40px', height: '48px', textAlign: 'center', fontSize: '18px', fontWeight: '600', padding: 0 }} type="text" inputMode="numeric"
                    maxLength={1} value={d}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)} />
                ))}
              </div>

              <button type="submit" className="ds-btn ds-btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? "Verifying…" : "Verify"}
              </button>
            </form>

            <div className="ds-mt-md ds-text-center ds-text-small ds-text-secondary">
              {canResend ? (
                <button onClick={handleResend} disabled={loading} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}>
                  Resend code
                </button>
              ) : (
                <>Resend code in <span className="ds-font-semibold">{fmt(countdown)}</span></>
              )}
            </div>

            <div className="ds-mt-lg ds-text-center ds-text-small ds-text-secondary">
              <Link to="/register" style={{ color: 'var(--text-primary)' }}>← Back to sign up</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

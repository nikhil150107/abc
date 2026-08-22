import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { API_BASE_URL as API } from "../api/api";
import Logo from "../components/Logo";

export default function AuditTrail() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [trail, setTrail] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const [evRes, vioRes] = await Promise.all([
          axios.get(`${API}/api/events?limit=200`),
          axios.get(`${API}/api/violations?limit=200`)
        ]);

        let items = [];

        // Map events
        evRes.data.data.forEach(e => {
          items.push({
            id: `evt-${e._id || e.eventId}`,
            time: new Date(e.timestamp),
            actor: "Ingestion",
            action: "EVENT_RECEIVED",
            resource: e.eventId || e.type,
            result: "SUCCESS",
            resultType: "success"
          });
        });

        // Map violations
        vioRes.data.data.forEach(v => {
          items.push({
            id: `vio-pol-${v._id || v.violationId}`,
            time: new Date(new Date(v.timestamp).getTime() + 100),
            actor: "Policy Engine",
            action: "POLICY_EVALUATED",
            resource: v.policy?.rule || v.type,
            result: "VIOLATION",
            resultType: "warning"
          });

          items.push({
            id: `vio-det-${v._id || v.violationId}`,
            time: new Date(new Date(v.timestamp).getTime() + 200),
            actor: "Compliance Agent",
            action: "VIOLATION_CREATED",
            resource: v.violationId || v.type,
            result: v.severity,
            resultType: v.severity === 'CRITICAL' || v.severity === 'HIGH' ? "critical" : "warning"
          });
        });

        items.sort((a, b) => b.time.getTime() - a.time.getTime());
        setTrail(items.slice(0, 300));
      } catch (err) {
        console.error("Failed to fetch audit data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditData();
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };
  const initials = user?.username?.slice(0, 2).toUpperCase() || "PG";

  const getResultStyle = (type) => {
    switch (type) {
      case 'success':
        return 'var(--color-compliant)';
      case 'critical':
        return 'var(--color-critical)';
      case 'warning':
      default:
        return 'var(--color-medium)';
    }
  };

  return (
    <div className="ds-layout">
      {/* LEFT SIDEBAR */}
      <aside className="ds-sidebar" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="sidebar-logo ds-flex-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo size={22} />
            PrivGuard
          </div>
          <label htmlFor="mobile-menu-toggle" className="mobile-menu-label" style={{ cursor: 'pointer', fontSize: '20px' }}>≡</label>
        </div>
        <input type="checkbox" id="mobile-menu-toggle" />

        <div className="sidebar-nav-container" style={{ flex: 1, overflowY: 'auto', paddingTop: '16px' }}>
          <div className="sidebar-nav-item" onClick={() => navigate("/dashboard")}>Dashboard</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/live-monitor")}>Live Monitor</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/violations")}>Violations</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/policies")}>Policies</div>
          <div className="sidebar-nav-item active">Audit Trail</div>
          <div className="sidebar-nav-item" onClick={() => navigate('/settings')} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate('/settings'); }}>Settings</div>
        </div>

        <div className="sidebar-bottom" style={{ padding: '16px', borderTop: '1px solid var(--border-medium)', background: 'var(--bg-primary)' }}>
          <div className="ds-flex-between ds-items-center">
            <div className="ds-flex ds-items-center ds-gap-sm ds-text-small ds-font-semibold">
              <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                {initials}
              </div>
              {user?.username}
            </div>
            <button className="ds-btn ds-btn-ghost" style={{ padding: '4px 8px', height: 'auto', fontSize: '12px' }} onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="ds-main">
        {/* TOP BAR */}
        <header className="ds-header">
          <div className="ds-text-small ds-text-muted ds-font-medium">
            PrivGuard / <span style={{ color: 'var(--text-primary)' }}>Audit Trail</span>
          </div>
        </header>

        <div className="ds-content">
          {/* PAGE HEADER */}
          <div className="ds-mb-lg ds-flex-between ds-items-end">
            <div>
              <h1 className="ds-heading-1">Audit Trail</h1>
              <p className="ds-text-body">Immutable record of compliance monitoring activity.</p>
            </div>
            <button className="ds-btn ds-btn-secondary" onClick={() => window.print()}>
              Export Evidence
            </button>
          </div>

          {/* AUDIT TABLE/TIMELINE HYBRID */}
          <div className="ds-card ds-table-wrapper" style={{ border: 'none' }}>
            <table className="ds-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Timestamp</th>
                  <th style={{ width: '160px' }}>Actor/System</th>
                  <th style={{ width: '220px' }}>Action</th>
                  <th>Resource</th>
                  <th style={{ width: '120px' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <div className="ds-text-body ds-text-secondary">Loading audit records...</div>
                    </td>
                  </tr>
                ) : trail.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <div className="ds-heading-3 ds-text-muted ds-mb-sm">No audit activity</div>
                      <div className="ds-text-body ds-text-secondary">Compliance activity will appear here as the system processes events.</div>
                    </td>
                  </tr>
                ) : (
                  trail.map((item, index) => (
                    <tr key={item.id || index} style={{ borderBottom: '1px solid var(--border-medium)' }}>
                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {item.time.toLocaleTimeString('en-US', { hour12: false })}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          {item.time.toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {item.actor}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', display: 'inline-block', padding: '4px 8px', borderRadius: '4px' }}>
                          {item.action}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '13px', wordBreak: 'break-all' }}>
                          {item.resource}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getResultStyle(item.resultType) }} />
                          <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                            {item.result}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { API_BASE_URL as API } from "../api/api";
import Logo from "../components/Logo";

function getCategory(rule) {
  if (!rule) return "Statutory Control";
  const str = rule.toUpperCase();
  if (str.includes("LOGGING") || str.includes("EXPOSURE")) return "Data Minimization";
  if (str.includes("CONSENT")) return "Consent Lifecycle";
  if (str.includes("RETENTION")) return "Data Retention";
  if (str.includes("PURPOSE")) return "Purpose Limitation";
  if (str.includes("ERASURE")) return "Data Subject Rights";
  return "Statutory Control";
}

function getPurpose(rule) {
  if (!rule) return "General Compliance";
  const str = rule.toUpperCase();
  if (str.includes("LOGGING")) return "Application Logging";
  if (str.includes("API")) return "API Transmission";
  if (str.includes("MARKETING")) return "Marketing Outreach";
  if (str.includes("ORDER")) return "Order Processing";
  if (str.includes("RETENTION")) return "Data Purge Lifecycle";
  return "Personal Data Processing";
}

export default function Policies() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [violationsCountMap, setViolationsCountMap] = useState({});
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [polRes, vioRes] = await Promise.all([
          axios.get(`${API}/api/policies`),
          axios.get(`${API}/api/violations?limit=200`)
        ]);

        const polData = polRes.data.data || [];
        setPolicies(polData);

        const vMap = {};
        const vioData = vioRes.data.data || [];
        vioData.forEach(v => {
          const pName = v.policy?.rule || v.type;
          vMap[pName] = (vMap[pName] || 0) + 1;
        });
        setViolationsCountMap(vMap);

      } catch (err) {
        console.error("Failed to fetch policies:", err);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  const activeCount = policies.filter(p => p.enabled).length;
  const disabledCount = policies.filter(p => !p.enabled).length;
  const linkedViolationsCount = Object.values(violationsCountMap).reduce((acc, curr) => acc + curr, 0);

  const initials = user?.username?.slice(0, 2).toUpperCase() || "PG";

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
          <div className="sidebar-nav-item active">Policies</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/audit-trail")}>Audit Trail</div>
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
            PrivGuard / <span style={{ color: 'var(--text-primary)' }}>Policies</span>
          </div>
        </header>

        <div className="ds-content">
          {/* PAGE HEADER */}
          <div className="ds-mb-lg ds-flex-between ds-items-end">
            <div>
              <h1 className="ds-heading-1">Policies</h1>
              <p className="ds-text-body">Configured DPDPA controls governing personal-data processing.</p>
            </div>
          </div>

          {/* STATISTICS OVERVIEW */}
          <div className="ds-grid ds-mb-lg" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="ds-card" style={{ padding: '24px' }}>
              <div className="ds-heading-3 ds-text-muted ds-mb-sm">Active Policies</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-compliant)' }}>{activeCount}</div>
            </div>
            <div className="ds-card" style={{ padding: '24px' }}>
              <div className="ds-heading-3 ds-text-muted ds-mb-sm">Disabled</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--text-secondary)' }}>{disabledCount}</div>
            </div>
            <div className="ds-card" style={{ padding: '24px' }}>
              <div className="ds-heading-3 ds-text-muted ds-mb-sm">Violations Linked</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-high)' }}>{linkedViolationsCount}</div>
            </div>
          </div>

          {/* POLICY TABLE */}
          <div className="ds-card ds-table-wrapper" style={{ border: 'none' }}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Category</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Violations</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {policies.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <div className="ds-heading-3 ds-text-muted ds-mb-sm">No policies configured</div>
                      <div className="ds-text-body ds-text-secondary">There are currently no policies available.</div>
                    </td>
                  </tr>
                ) : (
                  policies.map((p, index) => {
                    const ruleName = p.rule || p.name;
                    const vCount = violationsCountMap[ruleName] || 0;
                    return (
                      <tr key={p._id || index} onClick={() => setSelected(p)} style={{ cursor: 'pointer' }} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSelected(p); }}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>
                            {ruleName}
                          </div>
                        </td>
                        <td>{getCategory(ruleName)}</td>
                        <td>{getPurpose(ruleName)}</td>
                        <td>
                          {p.enabled ? (
                            <span className="ds-flex ds-items-center ds-gap-sm ds-font-medium ds-text-small" style={{ color: 'var(--color-compliant)' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-compliant)' }} />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="ds-flex ds-items-center ds-gap-sm ds-font-medium ds-text-small ds-text-secondary">
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)' }} />
                              DISABLED
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ color: vCount > 0 ? 'var(--color-high)' : 'var(--text-secondary)', fontWeight: vCount > 0 ? '600' : '400' }}>
                            {vCount} violation{vCount !== 1 && 's'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {new Date(p.updatedAt || p.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* POLICY DETAILS MODAL */}
      {selected && (
        <div className="ds-modal-overlay" onClick={() => setSelected(null)}>
          <div className="ds-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="ds-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div>
                <h2 className="ds-heading-1 ds-mb-sm" style={{ fontSize: '20px', fontFamily: 'monospace' }}>
                  {selected.rule || selected.name}
                </h2>
                <div className="ds-flex ds-items-center ds-gap-md ds-mt-sm">
                  {selected.enabled ? (
                    <span className="ds-badge ds-badge-compliant">ACTIVE</span>
                  ) : (
                    <span className="ds-badge ds-badge-neutral">DISABLED</span>
                  )}
                  <span className="ds-text-small ds-font-medium ds-text-secondary">Severity: {selected.severity || 'MEDIUM'}</span>
                </div>
              </div>
              <button className="ds-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="ds-modal-body" style={{ padding: '32px 24px' }}>
              <div className="ds-mb-lg">
                <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>DESCRIPTION</h3>
                <p className="ds-text-body" style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>
                  {selected.description || "No description provided for this statutory control."}
                </p>
              </div>

              <div className="ds-grid ds-mb-lg" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>CATEGORY</h3>
                  <div className="ds-text-body ds-font-medium">{getCategory(selected.rule || selected.name)}</div>
                </div>
                <div>
                  <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>PURPOSE</h3>
                  <div className="ds-text-body ds-font-medium">{getPurpose(selected.rule || selected.name)}</div>
                </div>
              </div>

              <div className="ds-mb-lg">
                <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>VIOLATIONS ENFORCED</h3>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: (violationsCountMap[selected.rule || selected.name] || 0) > 0 ? 'var(--color-high)' : 'var(--text-secondary)' }}>
                    {violationsCountMap[selected.rule || selected.name] || 0}
                  </div>
                  <div className="ds-text-small ds-text-secondary ds-mt-xs">Total violations captured under this policy</div>
                </div>
              </div>

              <div>
                <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>LIFECYCLE</h3>
                <div className="ds-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div className="ds-text-small ds-text-muted ds-mb-xs">Created On</div>
                    <div className="ds-text-body ds-font-medium">{new Date(selected.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="ds-text-small ds-text-muted ds-mb-xs">Last Updated</div>
                    <div className="ds-text-body ds-font-medium">{new Date(selected.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="ds-modal-footer">
              <button className="ds-btn ds-btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

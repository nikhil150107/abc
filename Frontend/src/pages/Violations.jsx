import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import axios from "axios";
import ViolationModal from "../components/ViolationModal";
import { API_BASE_URL as API } from "../api/api";

function timeAgo(ts) {
  if (!ts) return "Just now";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff <= 5 || diff < 0) return "Just now";
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Violations() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [violations, setViolations] = useState([]);
  const [selected, setSelected]     = useState(null);
  
  // Filters
  const [search, setSearch]       = useState("");
  const [severity, setSeverity]   = useState("ALL");
  const [status, setStatus]       = useState("ALL");
  const [type, setType]           = useState("ALL");
  
  // Derived types for filter dropdown
  const uniqueTypes = [...new Set(violations.map(v => v.type))].filter(Boolean);

  const fetchData = async () => {
    try {
      const v = await axios.get(`${API}/api/violations?limit=200`);
      setViolations(v.data.data);
    } catch (_) {}
  };

  useEffect(() => {
    fetchData();
    const socket = io(API);

    socket.on("NEW_VIOLATION", (v) => {
      setViolations(prev => [v, ...prev.slice(0, 199)]);
    });

    socket.on("DATA_RESET", () => {
      setViolations([]);
    });

    return () => socket.disconnect();
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  // Client-side filtering
  const filtered = violations.filter(v => {
    if (severity !== "ALL" && v.severity !== severity) return false;
    if (status !== "ALL" && v.status !== status) return false;
    if (type !== "ALL" && v.type !== type) return false;
    if (search) {
      const query = search.toLowerCase();
      const finding = (v.title || v.type.replace(/_/g, " ")).toLowerCase();
      const source = (v.endpoint || v.service || "").toLowerCase();
      if (!finding.includes(query) && !source.includes(query)) return false;
    }
    return true;
  });

  const initials = user?.username?.slice(0, 2).toUpperCase() || "PG";

  return (
    <div className="ds-layout">
      {/* LEFT SIDEBAR */}
      <aside className="ds-sidebar" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="sidebar-logo ds-flex-between">
          PrivGuard
          <label htmlFor="mobile-menu-toggle" className="mobile-menu-label" style={{ cursor: 'pointer', fontSize: '20px' }}>≡</label>
        </div>
        <input type="checkbox" id="mobile-menu-toggle" />

        <div className="sidebar-nav-container" style={{ flex: 1, overflowY: 'auto', paddingTop: '16px' }}>
          <div className="sidebar-nav-item" onClick={() => navigate("/dashboard")}>Dashboard</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/live-monitor")}>Live Monitor</div>
          <div className="sidebar-nav-item active">Violations</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/policies")}>Policies</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/audit-trail")}>Audit Trail</div>
          <div className="sidebar-nav-item" onClick={() => navigate('/settings')} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate('/settings'); }}>Settings</div>
        </div>

        {/* BOTTOM SIDEBAR */}
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
            PrivGuard / <span style={{ color: 'var(--text-primary)' }}>Violations</span>
          </div>
        </header>

        <div className="ds-content">
          {/* PAGE HEADER */}
          <div className="ds-mb-lg">
            <h1 className="ds-heading-1">Violations</h1>
            <p className="ds-text-body">Monitor, investigate and resolve DPDPA compliance findings.</p>
          </div>

          {/* TOP CONTROLS */}
          <div className="ds-card ds-mb-lg" style={{ padding: '16px', display: 'flex', flexDirection: 'row', gap: '16px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)' }}>
            <input 
              type="text" 
              className="ds-input" 
              placeholder="Search findings or endpoints..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            
            <select value={severity} onChange={e => setSeverity(e.target.value)} className="ds-input" style={{ width: '140px' }}>
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select value={type} onChange={e => setType(e.target.value)} className="ds-input" style={{ width: '180px' }}>
              <option value="ALL">All Violation Types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>

            <select value={status} onChange={e => setStatus(e.target.value)} className="ds-input" style={{ width: '140px' }}>
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          {/* MAIN TABLE */}
          <div className="ds-card ds-table-wrapper" style={{ border: 'none', background: 'var(--bg-secondary)' }}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Finding</th>
                  <th>Database Table / Origin</th>
                  <th>Type</th>
                  <th>Endpoint</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Detected</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <div className="ds-heading-3 ds-text-muted ds-mb-sm">No compliance findings</div>
                      <div className="ds-text-body ds-text-secondary">No violations match the current filters.</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => (
                    <tr key={v._id || v.violationId} onClick={() => setSelected(v)} style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }} className="violation-row" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSelected(v); }}>
                      <td><span className={`ds-badge ds-badge-${v.severity.toLowerCase()}`}>{v.severity}</span></td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {v.title || v.type.replace(/_/g, " ")}
                        {v.occurrences > 1 && (
                          <span className="ds-badge ds-badge-neutral" style={{ marginLeft: 8 }}>{v.occurrences}x</span>
                        )}
                      </td>
                      <td>
                        <code style={{ background: 'var(--bg-tertiary)', color: '#38bdf8', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                          {v.breachLocation?.table || (v.source === 'APPLICATION_LOG' ? 'application_audit_logs' : 'data_processing_events')}
                        </code>
                      </td>
                      <td>{v.type}</td>
                      <td><code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{v.endpoint || v.service || '—'}</code></td>
                      <td style={{ fontWeight: 500 }}>{v.riskScore}</td>
                      <td>{v.status}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{timeAgo(v.timestamp)}</td>
                      <td>
                        <button className="ds-btn ds-btn-ghost" style={{ padding: '4px 8px', height: '24px', fontSize: '11px' }} onClick={(e) => { e.stopPropagation(); setSelected(v); }}>
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* VIOLATION DETAIL MODAL */}
      <ViolationModal selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

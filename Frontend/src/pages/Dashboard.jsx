import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import axios from "axios";
import AuditReportModal from "../components/AuditReportModal";
import ViolationModal from "../components/ViolationModal";
import { generateAuditReportPDF } from "../utils/pdfGenerator";
import { API_BASE_URL as API } from "../api/api";
import Logo from "../components/Logo";

// Kept for backward compatibility in modals
const SEV_COLOR = { HIGH: "var(--color-high)", MEDIUM: "var(--color-medium)", LOW: "var(--color-low)", CRITICAL: "var(--color-critical)" };
const SEV_BG    = { HIGH: "var(--bg-high)", MEDIUM: "var(--bg-medium)", LOW: "var(--bg-low)", CRITICAL: "var(--bg-critical)" };

function ComplianceRing({ score }) {
  const r = 24, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "var(--color-compliant)" : score >= 50 ? "var(--color-medium)" : "var(--color-high)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border-medium)" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 28 28)" />
    </svg>
  );
}

function timeAgo(ts) {
  if (!ts) return "Just now";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff <= 5 || diff < 0) return "Just now";
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]           = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0, open: 0, totalEvents: 0, complianceScore: 100 });
  const [violations, setViolations] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState("ALL");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [scanning, setScanning]       = useState(false);
  const [scanResult, setScanResult]   = useState(null);
  const [clearing, setClearing]       = useState(false);
  const [reportModal, setReportModal] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const fetchData = async () => {
    try {
      const [s, v] = await Promise.all([
        axios.get(`${API}/api/violations/stats/summary`),
        axios.get(`${API}/api/violations?limit=50`),
      ]);
      setStats(s.data.data);
      setViolations(v.data.data);
      setLastUpdated(new Date());
    } catch (_) {}
  };

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await axios.post(`${API}/api/audit/scan-target`);
      setScanResult(res.data.scanSummary);
      await fetchData();
    } catch (err) {
      alert(`Scan failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const clearData = async () => {
    if (!window.confirm("Clear all current violations and events for a fresh real-time run?")) return;
    setClearing(true);
    try {
      await axios.delete(`${API}/api/violations/reset/all`);
      setViolations([]);
      setLiveEvents([]);
      setScanResult(null);
      await fetchData();
    } catch (err) {
      alert(`Clear failed: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  const exportReport = async () => {
    try {
      const res = await axios.get(`${API}/api/audit/report`);
      if (res.data?.report) {
        setReportModal(res.data.report);
      }
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const downloadPDFDirectly = async () => {
    setGeneratingPDF(true);
    try {
      const res = await axios.get(`${API}/api/audit/report`);
      if (res.data?.report) {
        generateAuditReportPDF({ report: res.data.report });
      }
    } catch (err) {
      alert(`PDF export failed: ${err.message}`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = io(API);

    socket.on("NEW_VIOLATION", (v) => {
      setViolations(prev => [v, ...prev.slice(0, 49)]);
      setLiveEvents(prev => [{
        time: new Date(v.timestamp || Date.now()).toLocaleTimeString(),
        msg: `Violation — ${v.type.replace(/_/g, " ")} (${v.severity})`,
        tag: "violation",
      }, ...prev.slice(0, 49)]);
      fetchData();
    });

    socket.on("NEW_EVENT", (e) => {
      setLiveEvents(prev => [{
        time: new Date(e.timestamp || Date.now()).toLocaleTimeString(),
        msg: `${e.type.replace(/_/g, " ")} · ${e.endpoint || e.service || ""}`,
        tag: "event",
      }, ...prev.slice(0, 49)]);
      fetchData();
      setLastUpdated(new Date());
    });

    socket.on("DATA_RESET", () => {
      setViolations([]);
      setLiveEvents([]);
      fetchData();
    });

    return () => socket.disconnect();
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  const filtered = violations.filter(v => filter === "ALL" || v.severity === filter);
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
          <div className="sidebar-nav-item active">Dashboard</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/live-monitor")}>Live Monitor</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/violations")}>Violations</div>
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
            PrivGuard / <span style={{ color: 'var(--text-primary)' }}>Privacy Compliance</span>
          </div>
        </header>

        <div className="ds-content">
          {/* 1. PAGE HEADER */}
          <div className="ds-flex-between ds-mb-lg" style={{ flexWrap: "wrap", gap: "24px", alignItems: "flex-end" }}>
            <div>
              <h1 className="ds-heading-1">Privacy Compliance</h1>
              <p className="ds-text-body">Continuous monitoring of personal-data processing and DPDPA policy violations.</p>
            </div>

            <div className="ds-flex ds-gap-sm" style={{ flexWrap: "wrap" }}>
              <button className="ds-btn ds-btn-ghost" onClick={clearData} disabled={clearing} style={{ color: 'var(--text-tertiary)' }}>
                {clearing ? "Clearing..." : "Reset Data"}
              </button>
              <button className="ds-btn ds-btn-ghost" onClick={exportReport}>
                View Audit Report
              </button>
              <button className="ds-btn ds-btn-ghost" onClick={downloadPDFDirectly} disabled={generatingPDF}>
                {generatingPDF ? "Generating PDF..." : "Download Audit PDF"}
              </button>
              <button className="ds-btn ds-btn-primary" onClick={runScan} disabled={scanning}>
                {scanning ? "Scanning Target..." : "Run Live DPDPA Scan"}
              </button>
            </div>
          </div>

          {scanResult && (
            <div className="ds-alert ds-alert-info ds-mb-lg ds-flex-between" style={{ background: 'var(--bg-secondary)', borderLeft: '4px solid var(--color-compliant)', color: 'var(--text-primary)' }}>
              <div>
                <span className="ds-font-semibold" style={{ color: 'var(--color-compliant)', marginRight: 8 }}>Audit Completed:</span>
                Scanned {scanResult.scannedLogs} logs & {scanResult.scannedEvents} events. Identified <span className="ds-font-semibold">{scanResult.violationsDetected}</span> compliance discrepancies.
              </div>
              <span className="ds-badge ds-badge-compliant">
                Score: {scanResult.complianceScore}%
              </span>
            </div>
          )}

          <div className="ds-grid ds-mb-lg" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* 2. PRIVACY POSTURE (Strong horizontal summary) */}
            <div className="ds-card" style={{ padding: '24px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
              <ComplianceRing score={stats.complianceScore} />
              <div>
                <div className="ds-heading-3 ds-text-muted ds-mb-sm">Privacy Posture</div>
                <div className="ds-flex ds-items-center ds-gap-md">
                  <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                    {stats.complianceScore}%
                  </div>
                  <div className="ds-text-small ds-text-secondary" style={{ borderLeft: '1px solid var(--border-medium)', paddingLeft: '16px' }}>
                    {stats.open === 0 
                      ? "No open findings affecting score" 
                      : <><span className="ds-font-semibold" style={{ color: 'var(--color-medium)' }}>{stats.open} open findings</span> affecting score</>
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* 3. RISK OVERVIEW (Clean risk summary) */}
            <div className="ds-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div style={{ padding: '24px', borderRight: '1px solid var(--border-medium)', textAlign: 'center' }}>
                <div className="ds-heading-3 ds-text-muted ds-mb-sm">Critical</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-critical)' }}>{stats.critical}</div>
              </div>
              <div style={{ padding: '24px', borderRight: '1px solid var(--border-medium)', textAlign: 'center' }}>
                <div className="ds-heading-3 ds-text-muted ds-mb-sm">High</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-high)' }}>{stats.high}</div>
              </div>
              <div style={{ padding: '24px', borderRight: '1px solid var(--border-medium)', textAlign: 'center' }}>
                <div className="ds-heading-3 ds-text-muted ds-mb-sm">Medium</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-medium)' }}>{stats.medium}</div>
              </div>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div className="ds-heading-3 ds-text-muted ds-mb-sm">Low</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-low)' }}>{stats.low}</div>
              </div>
            </div>
          </div>

          {/* 5. RECENT VIOLATIONS (Enterprise Table) */}
          <div className="ds-card ds-mb-lg">
            <div className="ds-card-header">
              <span className="ds-heading-2" style={{ fontSize: 16 }}>Recent Violations</span>
              <select value={filter} onChange={e => setFilter(e.target.value)} className="ds-input" style={{ width: 'auto', height: 32, fontSize: 12 }}>
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div className="ds-heading-3 ds-text-muted ds-mb-sm">No compliance findings</div>
                <div className="ds-text-body ds-text-secondary">No violations match the current filters.</div>
              </div>
            ) : (
              <div className="ds-table-wrapper" style={{ border: 'none' }}>
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Finding</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th>Severity</th>
                      <th>Risk</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v) => (
                      <tr key={v._id || v.violationId} onClick={() => setSelected(v)} style={{ cursor: 'pointer' }} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSelected(v); }}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {v.title || v.type.replace(/_/g, " ")}
                          {v.occurrences > 1 && (
                            <span className="ds-badge ds-badge-neutral" style={{ marginLeft: 8 }}>{v.occurrences}x</span>
                          )}
                        </td>
                        <td>{v.type}</td>
                        <td><code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{v.endpoint || v.service}</code></td>
                        <td><span className={`ds-badge ds-badge-${v.severity.toLowerCase()}`}>{v.severity}</span></td>
                        <td>{v.riskScore}</td>
                        <td>{v.status}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{timeAgo(v.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. LIVE ACTIVITY (Professional timeline) */}
          <div className="ds-card">
            <div className="ds-card-header">
              <span className="ds-heading-2" style={{ fontSize: 16 }}>Live Activity Stream</span>
            </div>
            
            <div className="ds-card-body">
              {liveEvents.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div className="ds-heading-3 ds-text-muted ds-mb-sm">No recent activity</div>
                  <div className="ds-text-body ds-text-secondary">Monitoring is active and waiting for incoming telemetry.</div>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '16px' }}>
                  {/* Timeline vertical line */}
                  <div style={{ position: 'absolute', left: '7px', top: '12px', bottom: '24px', width: '2px', background: 'var(--border-medium)' }} />
                  
                  {liveEvents.map((e, i) => {
                    let title = e.msg;
                    let sub = "";
                    let dotColor = 'var(--border-dark)'; // default for events
                    
                    if (e.tag === 'violation' && e.msg.includes('—')) {
                      [sub, title] = e.msg.split('—').map(s => s.trim());
                      // Extract severity if present (e.g. "PII EXPOSED (HIGH)")
                      const sevMatch = title.match(/\((CRITICAL|HIGH|MEDIUM|LOW)\)$/);
                      if (sevMatch) {
                        const sev = sevMatch[1].toLowerCase();
                        dotColor = `var(--color-${sev})`;
                        title = title.replace(/\s*\(.*?\)$/, ''); // remove (HIGH) from title
                      } else {
                        dotColor = 'var(--color-high)'; // fallback
                      }
                    } else if (e.tag === 'event' && e.msg.includes('·')) {
                      [title, sub] = e.msg.split('·').map(s => s.trim());
                    }
                    
                    return (
                      <div key={i} style={{ position: 'relative', paddingBottom: '24px', display: 'flex', gap: '16px' }}>
                        {/* Timeline dot */}
                        <div style={{ position: 'absolute', left: '-13px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: dotColor, border: '2px solid var(--bg-secondary)' }} />
                        
                        <div style={{ width: '80px', flexShrink: 0, fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace', paddingTop: '2px' }}>
                          {e.time}
                        </div>
                        
                        <div>
                          <div className="ds-text-body ds-font-medium" style={{ color: e.tag === 'violation' ? dotColor : 'var(--text-primary)' }}>
                            {title}
                          </div>
                          {sub && <div className="ds-text-small ds-text-secondary" style={{ marginTop: '2px' }}>{sub}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VIOLATION DETAIL MODAL */}
      <ViolationModal selected={selected} onClose={() => setSelected(null)} />

      {/* AUDIT REPORT PREVIEW & PRINT MODAL */}
      {reportModal && (
        <AuditReportModal report={reportModal} onClose={() => setReportModal(null)} />
      )}
    </div>
  );
}

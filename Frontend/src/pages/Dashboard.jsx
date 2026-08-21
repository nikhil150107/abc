import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import axios from "axios";
import AuditReportModal from "../components/AuditReportModal";
import { generateAuditReportPDF } from "../utils/pdfGenerator";

const API = "http://localhost:5000";

const SEV_COLOR = { HIGH: "#C43232", MEDIUM: "#B54708", LOW: "#18794E", CRITICAL: "#5B21B6" };
const SEV_BG    = { HIGH: "#FDECEC", MEDIUM: "#FFF4E5", LOW: "#E8F5EE", CRITICAL: "#EDE9FE" };

function ComplianceRing({ score }) {
  const r = 48, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#18794E" : score >= 50 ? "#B54708" : "#C43232";
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#EAE7DF" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 60 60)" />
      <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="700" fill={color}
        fontFamily="Inter,sans-serif">{score}%</text>
      <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#98A2B3"
        fontFamily="Inter,sans-serif">score</text>
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

const formatRuleName = (rule) => {
  if (!rule) return "—";
  return rule
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .map(word => {
      if (["pan", "kyc", "pii", "otp", "aadhaar"].includes(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

const formatViolationType = (type) => {
  if (!type) return "Compliance Violation";
  switch (type) {
    case "PII_EXPOSURE": return "PII Exposure";
    case "PURPOSE_MISMATCH": return "Purpose Mismatch";
    case "RETENTION_VIOLATION": return "Retention Violation";
    default:
      return type
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
  }
};

const formatServiceName = (srv) => {
  if (!srv) return "—";
  return srv
    .replace(/-/g, " ")
    .toLowerCase()
    .split(" ")
    .map(word => {
      if (word === "demoapp") return "DemoApp";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

const formatStatus = (status) => {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const formatSourceName = (src) => {
  if (!src) return "—";
  if (src === "API") return "API";
  return src
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

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
        msg: `Violation — ${formatViolationType(v.type)} (${v.severity ? v.severity.charAt(0).toUpperCase() + v.severity.slice(1).toLowerCase() : ""})`,
        tag: "violation",
      }, ...prev.slice(0, 49)]);
      fetchData();
    });

    socket.on("NEW_EVENT", (e) => {
      setLiveEvents(prev => [{
        time: new Date(e.timestamp || Date.now()).toLocaleTimeString(),
        msg: `${formatViolationType(e.type)} · ${e.endpoint || formatServiceName(e.service) || ""}`,
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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || "PG";

  return (
    <div className="pg-layout">
      {/* SIDEBAR */}
      <aside className="pg-sidebar">
        <div className="pg-sidebar-logo">
          <div className="pg-sidebar-logo-mark">◇</div>
          <span className="pg-sidebar-logo-name">PrivGuard</span>
        </div>

        <div className="pg-nav-section">
          <div className="pg-nav-section-label">Overview</div>
          <div className="pg-nav-item active"><span className="pg-nav-icon">⊞</span> Dashboard</div>
          <div className="pg-nav-item"><span className="pg-nav-icon">⚡</span> Live Monitor</div>
        </div>

        <div className="pg-nav-section">
          <div className="pg-nav-section-label">Compliance</div>
          <div className="pg-nav-item"><span className="pg-nav-icon">🚨</span> Violations</div>
          <div className="pg-nav-item"><span className="pg-nav-icon">📋</span> Policies</div>
        </div>

        <div className="pg-nav-section">
          <div className="pg-nav-section-label">Governance</div>
          <div className="pg-nav-item"><span className="pg-nav-icon">📁</span> Audit Trail</div>
        </div>

        <div className="pg-nav-section">
          <div className="pg-nav-section-label">System</div>
          <div className="pg-nav-item"><span className="pg-nav-icon">⚙</span> Settings</div>
        </div>

        <div className="pg-sidebar-footer">
          <div className="pg-monitor-badge">
            <div className="pg-monitor-dot" />
            Monitoring Active
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="pg-main">
        {/* TOPBAR */}
        <header className="pg-topbar">
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Privacy Compliance Dashboard
          </span>
          <div className="pg-topbar-right">
            <div className="pg-topbar-user">
              <div className="pg-avatar">{initials}</div>
              <span>{user?.username}</span>
            </div>
            <button className="btn btn-secondary" onClick={handleLogout}>Sign out</button>
          </div>
        </header>

        <div className="pg-content">
          {/* PAGE HEADER */}
          <div className="pg-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div className="pg-page-title">{greeting()}, {user?.username}.</div>
              <div className="pg-page-sub">Autonomous DPDPA Compliance Monitoring & Statutory Enforcement Engine.</div>
              <div className="pg-last-updated">
                <div className="pg-monitor-dot" style={{ width: 6, height: 6, background: "#18794E", borderRadius: "50%", animation: "pulse 2s infinite" }} />
                Last updated {timeAgo(lastUpdated)}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                onClick={runScan}
                disabled={scanning}
                style={{ padding: "10px 18px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                {scanning ? "🔍 Scanning Target..." : "⚡ Run Live DPDPA Scan"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={downloadPDFDirectly}
                disabled={generatingPDF}
                style={{ padding: "10px 18px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px", background: "#EEF2FF", color: "#4F46E5", borderColor: "#C7D2FE", fontWeight: "600" }}
              >
                {generatingPDF ? "⏳ Generating PDF..." : "📥 Download Audit PDF"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={exportReport}
                style={{ padding: "10px 18px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                📄 View Audit Report
              </button>
              <button
                className="btn btn-secondary"
                onClick={clearData}
                disabled={clearing}
                style={{ padding: "10px 18px", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px", color: "var(--danger)", borderColor: "#FCA5A5" }}
              >
                {clearing ? "Clearing..." : "🗑 Reset Data"}
              </button>
            </div>
          </div>

          {scanResult && (
            <div style={{
              background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534",
              padding: "12px 18px", borderRadius: "10px", marginBottom: "1.5rem",
              display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem"
            }}>
              <div>
                <b>✓ Autonomous DPDPA Audit Completed:</b> Scanned {scanResult.scannedLogs} logs & {scanResult.scannedEvents} events on target application. Identified <b>{scanResult.violationsDetected}</b> compliance discrepancies.
              </div>
              <span style={{ fontWeight: "700", background: "#DCFCE7", padding: "4px 10px", borderRadius: "6px" }}>
                Score: {scanResult.complianceScore}%
              </span>
            </div>
          )}

          {/* COMPLIANCE + METRICS */}
          <div className="pg-compliance-card">
            <ComplianceRing score={stats.complianceScore} />
            <div className="pg-compliance-text">
              <div className="pg-compliance-label">Privacy Posture</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: "var(--text-head)", lineHeight: 1 }}>
                {stats.complianceScore}%
              </div>
              <div className="pg-compliance-delta">
                {stats.open === 0 ? "✓ No open violations" : `${stats.open} open violation${stats.open > 1 ? "s" : ""} affecting score`}
              </div>
            </div>
          </div>

          <div className="pg-metrics">
            <div className="pg-metric-card">
              <div className="pg-metric-label">Events Today</div>
              <div className="pg-metric-value">{stats.totalEvents.toLocaleString()}</div>
              <div className="pg-metric-delta delta-up">↑ Monitored</div>
            </div>
            <div className="pg-metric-card">
              <div className="pg-metric-label">Violations</div>
              <div className="pg-metric-value">{stats.total}</div>
              <div className="pg-metric-delta delta-warn">{stats.open} open</div>
            </div>
            <div className="pg-metric-card">
              <div className="pg-metric-label">High Risk</div>
              <div className="pg-metric-value" style={{ color: "var(--danger)" }}>{stats.high}</div>
              <div className="pg-metric-delta delta-down">{stats.high > 0 ? "Needs attention" : "✓ Clear"}</div>
            </div>
            <div className="pg-metric-card">
              <div className="pg-metric-label">Medium Risk</div>
              <div className="pg-metric-value" style={{ color: "var(--warn)" }}>{stats.medium}</div>
              <div className="pg-metric-delta delta-warn">{stats.medium > 0 ? "Review recommended" : "✓ Clear"}</div>
            </div>
          </div>

          {/* PANELS */}
          <div className="pg-panels">
            {/* LIVE ACTIVITY */}
            <div className="pg-panel">
              <div className="pg-panel-header">
                <span className="pg-panel-title">Live Activity</span>
                <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 500 }}>● Live</span>
              </div>
              <div className="live-feed">
                {liveEvents.length === 0 && <div className="live-empty">Waiting for events…</div>}
                {liveEvents.map((e, i) => (
                  <div key={i} className={`live-item live-${e.tag}`}>
                    <div className="live-dot" style={{ background: e.tag === "violation" ? "var(--danger)" : "var(--indigo)" }} />
                    <span className="live-time">{e.time}</span>
                    <span className="live-msg">{e.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VIOLATIONS */}
            <div className="pg-panel">
              <div className="pg-panel-header">
                <span className="pg-panel-title">Recent Violations</span>
                <select value={filter} onChange={e => setFilter(e.target.value)} className="filter-select">
                  <option value="ALL">All</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div className="violations-list">
                {filtered.length === 0 && (
                  <div className="live-empty">{filter === "ALL" ? "No violations yet." : `No ${filter} violations.`}</div>
                )}
                {filtered.map((v) => (
                  <div key={v._id || v.violationId} className="v-row" onClick={() => setSelected(v)}>
                    <div className="v-dot" style={{ background: SEV_COLOR[v.severity] || "#98A2B3" }} />
                    <div className="v-body">
                      <div className="v-title">
                        {v.title || formatViolationType(v.type)}
                        {v.occurrences > 1 && (
                          <span style={{ marginLeft: 6, fontSize: 10, background: "#FEF08A", color: "#854D0E", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                            {v.occurrences}x
                          </span>
                        )}
                      </div>
                      <div className="v-sub">{v.endpoint || "—"} · {formatServiceName(v.service)} · {v.detectedPII?.join(", ")}</div>
                    </div>
                    <span className="v-badge" style={{ background: SEV_COLOR[v.severity], color: "white" }}>
                      {v.severity ? v.severity.charAt(0).toUpperCase() + v.severity.slice(1).toLowerCase() : ""}
                    </span>
                    <span className="v-time">{timeAgo(v.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VIOLATION DETAIL MODAL */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>✕</button>

            <div className="modal-header">
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: SEV_BG[selected.severity] || "#f3f4f6",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>
                {selected.severity === "HIGH" ? "🔴" : selected.severity === "CRITICAL" ? "🟣" : selected.severity === "MEDIUM" ? "🟡" : "🟢"}
              </div>
              <div>
                <div className="modal-title">{selected.title || formatViolationType(selected.type)}</div>
                <div className="modal-sub">
                  <span className="v-badge" style={{ background: SEV_COLOR[selected.severity] }}>
                    {selected.severity ? selected.severity.charAt(0).toUpperCase() + selected.severity.slice(1).toLowerCase() : ""}
                  </span>
                  Risk Score: <b>{selected.riskScore}</b>
                </div>
              </div>
            </div>

            <div className="modal-grid">
              <div className="modal-field"><span>Endpoint</span><b>{selected.endpoint || "—"}</b></div>
              <div className="modal-field"><span>Service</span><b>{formatServiceName(selected.service)}</b></div>
              <div className="modal-field"><span>Detected PII</span><b>{selected.detectedPII?.join(", ") || "—"}</b></div>
              <div className="modal-field"><span>Status</span><b>{formatStatus(selected.status)}</b></div>
              <div className="modal-field"><span>Policy Rule</span><b>{formatRuleName(selected.policy?.rule)}</b></div>
              <div className="modal-field"><span>Detected At</span><b>{new Date(selected.timestamp).toLocaleString()}</b></div>
            </div>

            {selected.reason && (
              <div className="modal-section">
                <div className="modal-section-title">⚖️ Statutory Reason</div>
                <p>{selected.reason}</p>
              </div>
            )}

            <div className="modal-section">
              <div className="modal-section-title">🔍 Detailed Compliance Explanation</div>
              <p>{selected.explanation || selected.aiExplanation || "No explanation provided."}</p>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">🛡️ Prescribed Remediation & Solution</div>
              <p>{selected.recommendation || "No recommendation provided."}</p>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT REPORT PREVIEW & PRINT MODAL */}
      {reportModal && (
        <AuditReportModal report={reportModal} onClose={() => setReportModal(null)} />
      )}
    </div>
  );
}

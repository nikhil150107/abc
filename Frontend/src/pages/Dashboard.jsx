import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import axios from "axios";

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
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]           = useState({ total: 0, high: 0, medium: 0, low: 0, open: 0, totalEvents: 0, complianceScore: 100 });
  const [violations, setViolations] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState("ALL");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = async () => {
    try {
      const [s, v] = await Promise.all([
        axios.get(`${API}/api/violations/stats/summary`),
        axios.get(`${API}/api/violations?limit=20`),
      ]);
      setStats(s.data.data);
      setViolations(v.data.data);
      setLastUpdated(new Date());
    } catch (_) {}
  };

  useEffect(() => {
    fetchData();
    const socket = io(API);

    socket.on("NEW_VIOLATION", (v) => {
      setViolations(prev => [v, ...prev.slice(0, 19)]);
      setLiveEvents(prev => [{
        time: new Date(v.timestamp).toLocaleTimeString(),
        msg: `Violation — ${v.type.replace(/_/g, " ")}`,
        tag: "violation",
      }, ...prev.slice(0, 49)]);
      fetchData();
    });

    socket.on("NEW_EVENT", (e) => {
      setLiveEvents(prev => [{
        time: new Date(e.timestamp).toLocaleTimeString(),
        msg: `${e.type.replace(/_/g, " ")} · ${e.endpoint || e.service || ""}`,
        tag: "event",
      }, ...prev.slice(0, 49)]);
      setLastUpdated(new Date());
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
          <div className="pg-page-header">
            <div>
              <div className="pg-page-title">{greeting()}, {user?.username}.</div>
              <div className="pg-page-sub">Here's your application's privacy posture at a glance.</div>
              <div className="pg-last-updated">
                <div className="pg-monitor-dot" style={{ width: 6, height: 6, background: "#18794E", borderRadius: "50%", animation: "pulse 2s infinite" }} />
                Last updated {timeAgo(lastUpdated)}
              </div>
            </div>
          </div>

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
                  <div key={v._id} className="v-row" onClick={() => setSelected(v)}>
                    <div className="v-dot" style={{ background: SEV_COLOR[v.severity] || "#98A2B3" }} />
                    <div className="v-body">
                      <div className="v-title">{v.type.replace(/_/g, " ")}</div>
                      <div className="v-sub">{v.endpoint || v.service} · {v.detectedPII?.join(", ")}</div>
                    </div>
                    <span className="v-badge" style={{ background: SEV_COLOR[v.severity], color: "white" }}>
                      {v.severity}
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
                <div className="modal-title">{selected.type.replace(/_/g, " ")}</div>
                <div className="modal-sub">
                  <span className="v-badge" style={{ background: SEV_COLOR[selected.severity] }}>{selected.severity}</span>
                  Risk Score: <b>{selected.riskScore}</b>
                </div>
              </div>
            </div>

            <div className="modal-grid">
              <div className="modal-field"><span>Endpoint</span><b>{selected.endpoint || "—"}</b></div>
              <div className="modal-field"><span>Service</span><b>{selected.service || "—"}</b></div>
              <div className="modal-field"><span>Detected PII</span><b>{selected.detectedPII?.join(", ") || "—"}</b></div>
              <div className="modal-field"><span>Status</span><b>{selected.status}</b></div>
              <div className="modal-field"><span>Policy Rule</span><b>{selected.policy?.rule || "—"}</b></div>
              <div className="modal-field"><span>Detected At</span><b>{new Date(selected.timestamp).toLocaleString()}</b></div>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">🤖 AI Explanation</div>
              <p>{selected.explanation || "No explanation provided."}</p>
            </div>

            <div className="modal-section">
              <div className="modal-section-title">✅ Recommended Fix</div>
              <p>{selected.recommendation || "No recommendation provided."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

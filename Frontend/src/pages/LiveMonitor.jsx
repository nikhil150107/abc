import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import axios from "axios";

const API = "http://localhost:5000";

export default function LiveMonitor() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stream, setStream] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    // Fetch recent events to populate the stream initially
    const fetchInitial = async () => {
      try {
        const [evRes, vioRes] = await Promise.all([
          axios.get(`${API}/api/events?limit=20`),
          axios.get(`${API}/api/violations?limit=20`)
        ]);
        
        let initialStream = [];
        
        // Map raw events
        evRes.data.data.forEach(e => {
          initialStream.push({
            id: `evt-${e._id || e.eventId}`,
            time: new Date(e.timestamp),
            type: "Event Received",
            primaryText: e.type,
            secondaryText: e.endpoint || e.service || "SYSTEM",
            category: "event",
            isNew: false
          });
        });
        
        // Map raw violations
        vioRes.data.data.forEach(v => {
          initialStream.push({
            id: `vio-pol-${v._id || v.violationId}`,
            time: new Date(new Date(v.timestamp).getTime() + 100),
            type: "Policy Evaluated",
            primaryText: v.policy?.rule || v.type,
            category: "policy",
            isNew: false
          });
          
          initialStream.push({
            id: `vio-det-${v._id || v.violationId}`,
            time: new Date(new Date(v.timestamp).getTime() + 200),
            type: v.severity === 'CRITICAL' || v.severity === 'HIGH' ? "PII Detected" : "Violation Created",
            primaryText: (v.detectedPII || []).join(", ") || v.type,
            secondaryText: v.endpoint || v.service || "SYSTEM",
            severity: v.severity,
            category: "violation",
            isNew: false
          });
        });
        
        initialStream.sort((a, b) => b.time.getTime() - a.time.getTime());
        setStream(initialStream.slice(0, 100));
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchInitial();

    const socket = io(API);
    
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("NEW_EVENT", (e) => {
      const ts = new Date(e.timestamp || Date.now());
      setStream(prev => [{
        id: `evt-live-${Date.now()}-${Math.random()}`,
        time: ts,
        type: "Event Received",
        primaryText: e.type,
        secondaryText: e.endpoint || e.service || "SYSTEM",
        category: "event",
        isNew: true
      }, ...prev].slice(0, 200));
    });

    socket.on("NEW_VIOLATION", (v) => {
      const ts = new Date(v.timestamp || Date.now());
      setStream(prev => {
        const newItems = [
          {
            id: `vio-det-live-${Date.now()}-${Math.random()}`,
            time: new Date(ts.getTime() + 200),
            type: v.severity === 'CRITICAL' || v.severity === 'HIGH' ? "PII Detected" : "Violation Created",
            primaryText: (v.detectedPII || []).join(", ") || v.type,
            secondaryText: v.endpoint || v.service || "SYSTEM",
            severity: v.severity,
            category: "violation",
            isNew: true
          },
          {
            id: `vio-pol-live-${Date.now()}-${Math.random()}`,
            time: new Date(ts.getTime() + 100),
            type: "Policy Evaluated",
            primaryText: v.policy?.rule || v.type,
            category: "policy",
            isNew: true
          }
        ];
        return [...newItems, ...prev].slice(0, 200);
      });
    });

    socket.on("DATA_RESET", () => {
      setStream([]);
    });

    return () => socket.disconnect();
  }, []);

  // Remove the 'isNew' flag after rendering so they don't re-animate
  useEffect(() => {
    if (stream.some(item => item.isNew)) {
      const timer = setTimeout(() => {
        setStream(prev => prev.map(item => ({ ...item, isNew: false })));
      }, 1500); // Highlight for ~1.5s as requested
      return () => clearTimeout(timer);
    }
  }, [stream]);

  const handleLogout = () => { logout(); navigate("/login"); };
  const initials = user?.username?.slice(0, 2).toUpperCase() || "PG";

  const eventsToday = stream.filter(s => s.category === 'event').length;
  const violationsToday = stream.filter(s => s.category === 'violation').length;
  const highRisk = stream.filter(s => s.severity === 'HIGH' || s.severity === 'CRITICAL').length;
  const mediumRisk = stream.filter(s => s.severity === 'MEDIUM').length;

  const getIndicatorColor = (item) => {
    if (item.category === 'event') return 'var(--color-low)'; // blue/neutral
    if (item.type === 'PII Detected') return 'var(--color-medium)'; // amber
    if (item.category === 'policy') return '#4F46E5'; // purple/indigo
    if (item.category === 'violation') return `var(--color-${item.severity?.toLowerCase() || 'high'})`;
    return 'var(--color-compliant)';
  };

  const getStatusBadge = (item) => {
    if (item.category === 'event') return <span className="ds-text-small ds-font-semibold" style={{ color: 'var(--color-low)' }}>SUCCESS</span>;
    if (item.type === 'PII Detected') return <span className="ds-text-small ds-font-semibold" style={{ color: 'var(--color-medium)' }}>DETECTED</span>;
    if (item.category === 'policy') return <span className="ds-text-small ds-font-semibold" style={{ color: '#4F46E5' }}>VIOLATION</span>; // Assuming policy failure for violations
    if (item.category === 'violation') return <span className={`ds-badge ds-badge-${item.severity?.toLowerCase() || 'high'}`}>{item.severity}</span>;
    return null;
  };

  return (
    <div className="ds-layout">
      {/* LEFT SIDEBAR */}
      <aside className="ds-sidebar" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="sidebar-logo ds-flex-between">
          PrivGuard
          <label htmlFor="mobile-menu-toggle" className="mobile-menu-label" style={{ cursor: 'pointer', fontSize: '20px' }}>≡</label>
        </div>
        <input type="checkbox" id="mobile-menu-toggle" style={{ display: 'none' }} />

        <div className="sidebar-nav-container" style={{ flex: 1, overflowY: 'auto', paddingTop: '16px' }}>
          <div className="sidebar-nav-item" onClick={() => navigate("/dashboard")} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate("/dashboard"); }}>Dashboard</div>
          <div className="sidebar-nav-item active">Live Monitor</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/violations")} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate("/violations"); }}>Violations</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/policies")} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate("/policies"); }}>Policies</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/audit-trail")} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate("/audit-trail"); }}>Audit Trail</div>
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
            PrivGuard / <span style={{ color: 'var(--text-primary)' }}>Live Monitor</span>
          </div>
        </header>

        <div className="ds-content">
          {/* SECTION 4: LIVE CONNECTION STATUS IN HEADER */}
          <div className="ds-flex-between ds-items-start ds-mb-lg" style={{ flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <h1 className="ds-heading-1">Live Monitor</h1>
              <p className="ds-text-body">Real-time visibility into application data processing and compliance activity.</p>
            </div>
            
            <div className="ds-flex ds-items-center ds-gap-sm" style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? 'var(--color-compliant)' : 'var(--color-high)', boxShadow: isConnected ? '0 0 8px var(--color-compliant)' : '0 0 8px var(--color-high)' }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  {isConnected ? 'Monitoring Active' : 'Monitoring Disconnected'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {isConnected ? 'Connected to real-time compliance stream' : 'Attempting to reconnect...'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: MONITORING SUMMARY */}
          <div className="ds-grid ds-mb-lg" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="ds-card" style={{ padding: '16px 24px' }}>
              <div className="ds-text-small ds-text-muted ds-font-medium ds-mb-xs">Events Today</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--text-primary)' }}>{eventsToday}</div>
            </div>
            <div className="ds-card" style={{ padding: '16px 24px' }}>
              <div className="ds-text-small ds-text-muted ds-font-medium ds-mb-xs">Violations</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--text-primary)' }}>{violationsToday}</div>
            </div>
            <div className="ds-card" style={{ padding: '16px 24px' }}>
              <div className="ds-text-small ds-text-muted ds-font-medium ds-mb-xs">High Risk</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-high)' }}>{highRisk}</div>
            </div>
            <div className="ds-card" style={{ padding: '16px 24px' }}>
              <div className="ds-text-small ds-text-muted ds-font-medium ds-mb-xs">Medium Risk</div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-medium)' }}>{mediumRisk}</div>
            </div>
          </div>

          {/* SECTION 5: FILTERS */}
          <div className="ds-flex ds-gap-sm ds-mb-md" style={{ flexWrap: 'wrap' }}>
            <select className="ds-input" style={{ width: '160px', height: '36px', fontSize: '13px' }}>
              <option value="ALL">All Events</option>
            </select>
            <select className="ds-input" style={{ width: '160px', height: '36px', fontSize: '13px' }}>
              <option value="ALL">All Sources</option>
            </select>
            <select className="ds-input" style={{ width: '160px', height: '36px', fontSize: '13px' }}>
              <option value="ALL">All Severity</option>
            </select>
            <input className="ds-input" type="text" placeholder="Search events..." style={{ width: '240px', height: '36px', fontSize: '13px' }} />
          </div>

          {/* SECTION 2: LIVE ACTIVITY */}
          <div className="ds-card">
            <div className="ds-card-header ds-flex-between ds-items-center">
              <div>
                <span className="ds-heading-2" style={{ fontSize: '16px' }}>Live Activity</span>
                <div className="ds-text-small ds-text-secondary">Real-time application and compliance events</div>
              </div>
              <div className="ds-flex ds-items-center ds-gap-sm" style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-compliant)' }} />
                <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Live</span>
              </div>
            </div>
            
            <div className="ds-table-wrapper" style={{ border: 'none' }}>
              <table className="ds-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Time</th>
                    <th style={{ width: '200px' }}>Event</th>
                    <th>Details</th>
                    <th style={{ width: '140px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stream.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div className="ds-heading-3 ds-text-muted ds-mb-sm">No recent compliance activity</div>
                        <div className="ds-text-body ds-text-secondary">Monitoring is active and waiting for incoming telemetry.</div>
                      </td>
                    </tr>
                  ) : (
                    stream.map((item) => (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedEvent(item)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedEvent(item); }}
                        style={{ 
                          background: item.isNew ? 'var(--bg-tertiary)' : 'transparent',
                          transition: 'background-color 1.5s ease',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ whiteSpace: 'nowrap', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '0', top: '0', bottom: '0', width: '3px', background: getIndicatorColor(item) }} />
                          <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                            {item.time.toLocaleTimeString('en-US', { hour12: false })}
                          </span>
                        </td>
                        <td style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                          {item.type}
                        </td>
                        <td>
                          <div style={{ fontWeight: '500' }}>{item.primaryText}</div>
                          {item.secondaryText && (
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: 'monospace' }}>
                              {item.secondaryText}
                            </div>
                          )}
                        </td>
                        <td>
                          {getStatusBadge(item)}
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

      {selectedEvent && (
        <div className="ds-modal-overlay">
          <div className="ds-modal" style={{ width: '500px' }}>
            <div className="ds-modal-header ds-flex-between">
              <div>
                <div className="ds-modal-title">Event Details</div>
                <div className="ds-text-small ds-text-secondary">Real-time compliance stream inspection</div>
              </div>
              <button className="ds-modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            
            <div className="ds-modal-body">
              <div className="ds-grid" style={{ gridTemplateColumns: '120px 1fr', gap: '16px 24px', fontSize: '13px' }}>
                <div className="ds-text-muted ds-font-medium">Event ID</div>
                <div className="ds-font-medium" style={{ fontFamily: 'monospace' }}>{selectedEvent.id.toUpperCase()}</div>

                <div className="ds-text-muted ds-font-medium">Timestamp</div>
                <div className="ds-font-medium">{selectedEvent.time.toLocaleString('en-US')}</div>

                <div className="ds-text-muted ds-font-medium">Source</div>
                <div className="ds-font-medium">API</div>

                <div className="ds-text-muted ds-font-medium">Service</div>
                <div className="ds-font-medium" style={{ fontFamily: 'monospace' }}>{selectedEvent.secondaryText || "SYSTEM"}</div>

                <div className="ds-text-muted ds-font-medium">Event Type</div>
                <div className="ds-font-medium">{selectedEvent.type}</div>

                <div className="ds-text-muted ds-font-medium">Detected Data</div>
                <div className="ds-font-medium">{selectedEvent.primaryText || "None"}</div>

                {selectedEvent.category === 'violation' && (
                  <>
                    <div className="ds-text-muted ds-font-medium">Severity</div>
                    <div><span className={`ds-badge ds-badge-${selectedEvent.severity?.toLowerCase() || 'high'}`}>{selectedEvent.severity}</span></div>
                  </>
                )}

                <div className="ds-text-muted ds-font-medium">Status</div>
                <div>{getStatusBadge(selectedEvent)}</div>
              </div>
            </div>
            
            <div className="ds-modal-footer">
              <button className="ds-btn ds-btn-primary" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

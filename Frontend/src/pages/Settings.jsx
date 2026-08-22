import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  const handleLogout = () => { logout(); navigate("/login"); };
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
        <input type="checkbox" id="mobile-menu-toggle" style={{ display: 'none' }} />

        <div className="sidebar-nav-container" style={{ flex: 1, overflowY: 'auto', paddingTop: '16px' }}>
          <div className="sidebar-nav-item" onClick={() => navigate("/dashboard")} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate("/dashboard"); }}>Dashboard</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/live-monitor")} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate("/live-monitor"); }}>Live Monitor</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/violations")} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate("/violations"); }}>Violations</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/policies")} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate("/policies"); }}>Policies</div>
          <div className="sidebar-nav-item" onClick={() => navigate("/audit-trail")} tabIndex={0} onKeyDown={(e) => { if(e.key==='Enter') navigate("/audit-trail"); }}>Audit Trail</div>
          <div className="sidebar-nav-item active">Settings</div>
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
            PrivGuard / <span style={{ color: 'var(--text-primary)' }}>Settings</span>
          </div>
        </header>

        <div className="ds-content">
          {/* PAGE HEADER */}
          <div className="ds-mb-lg">
            <h1 className="ds-heading-1">Settings</h1>
            <p className="ds-text-body">Manage your workspace preferences and account configurations.</p>
          </div>

          <div className="ds-grid" style={{ gridTemplateColumns: '250px 1fr', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className={`ds-btn ${activeTab === 'profile' ? 'ds-btn-secondary' : 'ds-btn-ghost'}`} 
                style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
                onClick={() => setActiveTab('profile')}
              >
                User Profile
              </button>
              <button 
                className={`ds-btn ${activeTab === 'notifications' ? 'ds-btn-secondary' : 'ds-btn-ghost'}`} 
                style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
                onClick={() => setActiveTab('notifications')}
              >
                Notifications
              </button>
              <button 
                className={`ds-btn ${activeTab === 'api' ? 'ds-btn-secondary' : 'ds-btn-ghost'}`} 
                style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
                onClick={() => setActiveTab('api')}
              >
                API Keys
              </button>
            </div>

            <div>
              {activeTab === 'profile' && (
                <div className="ds-card ds-card-body">
                  <h2 className="ds-heading-2 ds-mb-lg">User Profile</h2>
                  
                  <div className="ds-form-group">
                    <label className="ds-label">Username</label>
                    <input className="ds-input" type="text" defaultValue={user?.username || ''} disabled style={{ background: 'var(--bg-tertiary)' }} />
                    <p className="ds-text-small ds-text-muted" style={{ marginTop: '4px' }}>Username cannot be changed.</p>
                  </div>
                  
                  <div className="ds-form-group">
                    <label className="ds-label">Email Address</label>
                    <input className="ds-input" type="email" placeholder="name@company.com" />
                  </div>

                  <button className="ds-btn ds-btn-primary" style={{ marginTop: '16px' }}>Save Changes</button>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="ds-card ds-card-body">
                  <h2 className="ds-heading-2 ds-mb-lg">Notifications</h2>
                  
                  <div className="ds-flex ds-items-center ds-gap-md ds-mb-md">
                    <input type="checkbox" id="notif-critical" defaultChecked />
                    <div>
                      <label htmlFor="notif-critical" className="ds-font-semibold" style={{ fontSize: '13px' }}>Critical Violations</label>
                      <div className="ds-text-small ds-text-muted">Email alerts for CRITICAL and HIGH severity findings.</div>
                    </div>
                  </div>

                  <div className="ds-flex ds-items-center ds-gap-md ds-mb-md">
                    <input type="checkbox" id="notif-reports" defaultChecked />
                    <div>
                      <label htmlFor="notif-reports" className="ds-font-semibold" style={{ fontSize: '13px' }}>Weekly Audit Reports</label>
                      <div className="ds-text-small ds-text-muted">Receive automated compliance summaries every Monday.</div>
                    </div>
                  </div>

                  <button className="ds-btn ds-btn-primary" style={{ marginTop: '16px' }}>Save Preferences</button>
                </div>
              )}

              {activeTab === 'api' && (
                <div className="ds-card ds-card-body">
                  <h2 className="ds-heading-2 ds-mb-lg">API Keys</h2>
                  
                  <p className="ds-text-body ds-mb-md">Use these keys to authenticate external services with the PrivGuard API.</p>

                  <div className="ds-form-group">
                    <label className="ds-label">Production Key</label>
                    <div className="ds-flex ds-gap-sm">
                      <input className="ds-input" type="password" defaultValue="sk_live_1234567890abcdef" disabled style={{ background: 'var(--bg-tertiary)' }} />
                      <button className="ds-btn ds-btn-secondary">Copy</button>
                    </div>
                  </div>

                  <button className="ds-btn ds-btn-secondary" style={{ marginTop: '8px' }}>Generate New Key</button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

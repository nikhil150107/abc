import React from "react";

export default function ViolationModal({ selected, onClose }) {
  if (!selected) return null;

  const loc = selected.breachLocation || {};
  const originTable = loc.table || (selected.source === 'APPLICATION_LOG' ? 'application_audit_logs' : 'data_processing_events / users');
  const targetColumns = (loc.columns && loc.columns.length > 0) 
    ? loc.columns 
    : (selected.detectedData || selected.detectedPII || []);

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        <div className="ds-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div>
            <h2 className="ds-heading-1 ds-mb-sm" style={{ fontSize: '22px' }}>
              {selected.title || selected.type.replace(/_/g, " ")}
            </h2>
            <div className="ds-flex ds-items-center ds-gap-md ds-mt-sm" style={{ flexWrap: 'wrap' }}>
              <span className={`ds-badge ds-badge-${selected.severity.toLowerCase()}`}>{selected.severity}</span>
              <span className="ds-text-small ds-font-medium ds-text-secondary">Risk Score {selected.riskScore}/100</span>
              <span className="ds-text-small ds-font-medium" style={{ color: selected.status === 'OPEN' ? 'var(--color-medium)' : 'var(--text-secondary)' }}>Status: {selected.status}</span>
              {selected.occurrences > 1 && (
                <span className="ds-badge ds-badge-neutral">{selected.occurrences} occurrences</span>
              )}
            </div>
          </div>
          <button className="ds-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="ds-modal-body" style={{ padding: '24px' }}>
          
          {/* 1. EXACT BREACH LOCATION & DATABASE ORIGIN PANEL */}
          <div className="ds-mb-lg" style={{ 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(30, 41, 59, 0.05) 100%)', 
            border: '1px solid rgba(239, 68, 68, 0.25)', 
            borderRadius: 'var(--radius-md)', 
            padding: '18px' 
          }}>
            <div className="ds-flex ds-items-center ds-gap-sm ds-mb-md">
              <span style={{ fontSize: '18px' }}>📍</span>
              <h3 className="ds-heading-3 ds-font-bold" style={{ color: 'var(--color-high)', letterSpacing: '0.04em', margin: 0 }}>
                EXACT BREACH LOCATION & DATABASE ORIGIN
              </h3>
            </div>

            <div className="ds-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <div className="ds-text-small ds-text-muted ds-font-semibold ds-mb-xs">🗄️ DATABASE TABLE</div>
                <div className="ds-text-body ds-font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <code style={{ background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-medium)', color: '#38bdf8' }}>
                    {originTable}
                  </code>
                </div>
              </div>

              <div>
                <div className="ds-text-small ds-text-muted ds-font-semibold ds-mb-xs">🏷️ TARGET COLUMN(S) / FIELDS</div>
                <div className="ds-flex ds-gap-xs" style={{ flexWrap: 'wrap' }}>
                  {targetColumns.length > 0 ? (
                    targetColumns.map((col, idx) => (
                      <span key={idx} style={{ background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border-medium)', fontFamily: 'monospace' }}>
                        {col}
                      </span>
                    ))
                  ) : (
                    <span className="ds-text-secondary ds-text-small">General Payload</span>
                  )}
                </div>
              </div>

              <div>
                <div className="ds-text-small ds-text-muted ds-font-semibold ds-mb-xs">🌐 ORIGIN TYPE / LAYER</div>
                <div className="ds-text-body ds-font-medium">
                  <span className="ds-badge ds-badge-neutral" style={{ fontSize: '11px' }}>
                    {loc.originType || selected.source || 'APPLICATION_LOG'}
                  </span>
                </div>
              </div>

              <div>
                <div className="ds-text-small ds-text-muted ds-font-semibold ds-mb-xs">⚙️ COMPONENT SUBSYSTEM</div>
                <div className="ds-text-small ds-text-secondary ds-font-medium">
                  {loc.component || selected.service || 'DemoApp Core'}
                </div>
              </div>
            </div>

            {loc.codeReference && (
              <div className="ds-mt-md" style={{ borderTop: '1px dashed var(--border-medium)', paddingTop: '10px' }}>
                <div className="ds-text-small ds-text-muted ds-font-semibold ds-mb-xs">💻 CODE REFERENCE / HANDLER</div>
                <div className="ds-text-small ds-text-secondary" style={{ fontFamily: 'monospace' }}>
                  {loc.codeReference || loc.handler}
                </div>
              </div>
            )}
          </div>

          {/* 2. OVERVIEW & EXPLANATION */}
          {selected.reason && (
            <div className="ds-mb-lg">
              <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>OVERVIEW</h3>
              <p className="ds-text-body ds-text-secondary">{selected.reason}</p>
            </div>
          )}

          {/* 3. DETECTED DATA & POLICY */}
          <div className="ds-grid ds-mb-lg" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>DETECTED PII</h3>
              <div className="ds-flex ds-gap-sm ds-mt-sm" style={{ flexWrap: 'wrap' }}>
                {(selected.detectedPII || []).length > 0 ? (
                  selected.detectedPII.map((pii, i) => (
                    <span key={i} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', fontFamily: 'monospace' }}>
                      {pii}
                    </span>
                  ))
                ) : (
                  <span className="ds-text-body ds-text-secondary">—</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>POLICY RULE</h3>
              <div className="ds-mt-sm">
                <code style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                  {selected.policy?.rule || selected.type || "—"}
                </code>
              </div>
            </div>
          </div>

          {/* 4. AI ASSESSMENT & REMEDIATION */}
          <div className="ds-mb-lg">
            <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>AI ASSESSMENT</h3>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dark)', borderLeft: '4px solid var(--text-primary)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
              <div className="ds-mb-md">
                <p className="ds-text-body ds-font-medium ds-mb-xs">Root Cause Analysis:</p>
                <p className="ds-text-body ds-text-secondary" style={{ lineHeight: '1.6' }}>
                  {selected.explanation || selected.aiExplanation || "No explanation provided."}
                </p>
              </div>
              <div>
                <p className="ds-text-body ds-font-medium ds-mb-xs" style={{ color: 'var(--color-compliant)' }}>Recommended Remediation:</p>
                <p className="ds-text-body ds-text-secondary" style={{ lineHeight: '1.6' }}>
                  {selected.recommendation || "No recommendation provided."}
                </p>
              </div>
            </div>
          </div>

          {/* 5. TIMELINE */}
          <div>
            <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>TIMELINE</h3>
            <div className="ds-mt-md" style={{ position: 'relative', paddingLeft: '16px' }}>
              <div style={{ position: 'absolute', left: '3px', top: '6px', bottom: '6px', width: '2px', background: 'var(--border-medium)' }} />
              
              <div className="ds-flex ds-gap-md ds-mb-sm" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-16px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-dark)' }} />
                <span className="ds-text-small ds-text-tertiary" style={{ width: '60px' }}>{new Date(selected.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="ds-text-body ds-text-secondary">Breach event detected in {originTable}</span>
              </div>
              <div className="ds-flex ds-gap-md ds-mb-sm" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-16px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-dark)' }} />
                <span className="ds-text-small ds-text-tertiary" style={{ width: '60px' }}>{new Date(selected.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="ds-text-body ds-text-secondary">Policy evaluated ({selected.policy?.policyId || selected.policyId || 'POL-001'})</span>
              </div>
              <div className="ds-flex ds-gap-md ds-mb-sm" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-16px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-high)' }} />
                <span className="ds-text-small ds-text-tertiary" style={{ width: '60px' }}>{new Date(selected.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="ds-text-body ds-font-medium">Violation registered</span>
              </div>
            </div>
          </div>

        </div>
        
        <div className="ds-modal-footer">
          <button className="ds-btn ds-btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

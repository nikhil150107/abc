import React from "react";

export default function ViolationModal({ selected, onClose }) {
  if (!selected) return null;

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="ds-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div>
            <h2 className="ds-heading-1 ds-mb-sm" style={{ fontSize: '24px' }}>
              {selected.title || selected.type.replace(/_/g, " ")}
            </h2>
            <div className="ds-flex ds-items-center ds-gap-md ds-mt-sm">
              <span className={`ds-badge ds-badge-${selected.severity.toLowerCase()}`}>{selected.severity}</span>
              <span className="ds-text-small ds-font-medium ds-text-secondary">Risk Score {selected.riskScore}</span>
              <span className="ds-text-small ds-font-medium" style={{ color: selected.status === 'OPEN' ? 'var(--color-medium)' : 'var(--text-secondary)' }}>Status: {selected.status}</span>
            </div>
          </div>
          <button className="ds-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="ds-modal-body" style={{ padding: '32px 24px' }}>
          
          {selected.reason && (
            <div className="ds-mb-lg">
              <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>OVERVIEW</h3>
              <p className="ds-text-body ds-font-medium">What happened:</p>
              <p className="ds-text-body ds-text-secondary ds-mt-sm">{selected.reason}</p>
            </div>
          )}

          <div className="ds-grid ds-mb-lg" style={{ gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div>
              <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>DETECTED DATA</h3>
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
              <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>POLICY</h3>
              <div className="ds-mt-sm">
                <code style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                  {selected.policy?.rule || selected.type || "—"}
                </code>
              </div>
            </div>
          </div>

          <div className="ds-mb-lg">
            <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>SOURCE</h3>
            <div className="ds-grid ds-mt-sm" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}>
              <div>
                <div className="ds-text-small ds-text-muted ds-mb-xs">Service</div>
                <div className="ds-text-body ds-font-medium">{selected.service || "—"}</div>
              </div>
              <div>
                <div className="ds-text-small ds-text-muted ds-mb-xs">Endpoint</div>
                <div className="ds-text-body ds-font-medium" style={{ fontFamily: 'monospace' }}>{selected.endpoint || "—"}</div>
              </div>
            </div>
          </div>

          <div className="ds-mb-lg">
            <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>AI ASSESSMENT</h3>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dark)', borderLeft: '4px solid var(--text-primary)', padding: '24px', borderRadius: 'var(--radius-md)' }}>
              <div className="ds-mb-md">
                <p className="ds-text-body ds-font-medium ds-mb-xs">Explanation:</p>
                <p className="ds-text-body ds-text-secondary" style={{ lineHeight: '1.6' }}>
                  {selected.explanation || selected.aiExplanation || "No explanation provided."}
                </p>
              </div>
              <div>
                <p className="ds-text-body ds-font-medium ds-mb-xs" style={{ color: 'var(--color-compliant)' }}>Recommended remediation:</p>
                <p className="ds-text-body ds-text-secondary" style={{ lineHeight: '1.6' }}>
                  {selected.recommendation || "No recommendation provided."}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="ds-heading-3 ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em' }}>TIMELINE</h3>
            <div className="ds-mt-md" style={{ position: 'relative', paddingLeft: '16px' }}>
              <div style={{ position: 'absolute', left: '3px', top: '6px', bottom: '6px', width: '2px', background: 'var(--border-medium)' }} />
              
              <div className="ds-flex ds-gap-md ds-mb-sm" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-16px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-dark)' }} />
                <span className="ds-text-small ds-text-tertiary" style={{ width: '60px' }}>{new Date(selected.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="ds-text-body ds-text-secondary">Event detected</span>
              </div>
              <div className="ds-flex ds-gap-md ds-mb-sm" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-16px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-dark)' }} />
                <span className="ds-text-small ds-text-tertiary" style={{ width: '60px' }}>{new Date(selected.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="ds-text-body ds-text-secondary">Policy evaluated</span>
              </div>
              <div className="ds-flex ds-gap-md ds-mb-sm" style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-16px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-high)' }} />
                <span className="ds-text-small ds-text-tertiary" style={{ width: '60px' }}>{new Date(selected.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="ds-text-body ds-font-medium">Violation created</span>
              </div>
              {(selected.explanation || selected.aiExplanation) && (
                <div className="ds-flex ds-gap-md" style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-16px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-primary)' }} />
                  <span className="ds-text-small ds-text-tertiary" style={{ width: '60px' }}>+1s</span>
                  <span className="ds-text-body ds-font-medium" style={{ color: 'var(--text-primary)' }}>AI assessment generated</span>
                </div>
              )}
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

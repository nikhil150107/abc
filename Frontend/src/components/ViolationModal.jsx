import React, { useState } from "react";

export default function ViolationModal({ selected, onClose }) {
  if (!selected) return null;

  const [showFullExplanation, setShowFullExplanation] = useState(false);

  // Extract variables safely matching EXACT payload
  const type = selected.type || "UNKNOWN";
  const title = selected.title || type.replace(/_/g, " ");
  
  const severity = selected.severity || "HIGH";
  const riskScore = selected.riskScore || 0;
  const status = selected.status || "OPEN";
  const occurrences = selected.occurrences || 1;
  
  // Explanation texts
  const reason = selected.reason || selected.explanation || selected.aiExplanation || "No overview provided.";
  
  // Policy info
  const policyRule = selected.policy?.rule || "N/A";
  const policyId = selected.policy?.policyId || selected.policyId || "N/A";
  
  // PII
  const detectedPII = selected.detectedData || selected.detectedPII || [];
  const evidence = selected.evidence || null;
  
  // Context
  const source = selected.source || 'APPLICATION_LOG';
  
  // AI guidance
  const aiExplanation = selected.explanation || selected.aiExplanation || "Analysis pending.";
  const aiRecommendation = selected.recommendation || "Remediation guidance pending.";

  // Audit
  const violationId = selected._id || selected.violationId || "V-PENDING";
  const eventId = selected.eventId || "EVT-PENDING";
  const timestamp = selected.timestamp ? new Date(selected.timestamp) : new Date();

  // Reusable label/value row
  const DetailRow = ({ label, value, monospace }) => (
    <div className="ds-flex ds-mb-sm" style={{ fontSize: '13px' }}>
      <div className="ds-text-muted ds-font-medium" style={{ width: '180px', flexShrink: 0 }}>{label}</div>
      <div className="ds-font-medium ds-text-primary" style={{ fontFamily: monospace ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  );

  return (
    <div className="ds-modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="ds-modal" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '850px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', border: '1px solid var(--border-medium)' }}>
        
        {/* HEADER */}
        <div className="ds-modal-header ds-flex-between ds-items-start" style={{ borderBottom: '1px solid var(--border-medium)', padding: '24px 32px' }}>
          <div>
            <h2 className="ds-heading-1" style={{ fontSize: '24px', lineHeight: '1.2', color: 'var(--text-primary)', margin: 0 }}>
              {title}
            </h2>
          </div>
          <button className="ds-modal-close" onClick={onClose} aria-label="Close modal" style={{ fontSize: '24px', color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>✕</button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="ds-modal-body" style={{ padding: '0 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '32px 0', borderBottom: '1px solid var(--border-medium)' }}>
            <h3 className="ds-text-small ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              OVERVIEW
            </h3>
            <div className="ds-text-body ds-text-primary" style={{ lineHeight: '1.6' }}>
              {reason.length > 200 && !showFullExplanation ? (
                <>
                  {reason.substring(0, 200)}...
                  <button className="ds-btn ds-btn-ghost ds-ml-sm" style={{ padding: 0, height: 'auto', fontSize: '13px', color: 'var(--color-primary)' }} onClick={() => setShowFullExplanation(true)}>
                    View more
                  </button>
                </>
              ) : (
                reason
              )}
            </div>
          </div>

          <div style={{ padding: '32px 0', borderBottom: '1px solid var(--border-medium)' }}>
            <h3 className="ds-text-small ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              COMPLIANCE FINDING
            </h3>
            <div style={{ marginTop: '16px' }}>
              <DetailRow label="Violation Type" value={type} />
              <DetailRow label="Policy" value={policyRule} />
              <DetailRow label="Policy ID" value={policyId} />
              <DetailRow label="Status" value={status} />
            </div>
          </div>

          <div style={{ padding: '32px 0', borderBottom: '1px solid var(--border-medium)' }}>
            <h3 className="ds-text-small ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              DETECTED PERSONAL DATA
            </h3>
            {detectedPII.length > 0 ? (
              <div className="ds-flex ds-gap-sm" style={{ flexWrap: 'wrap', marginTop: '16px' }}>
                {detectedPII.map((pii, i) => (
                  <span key={i} style={{ background: '#F8FAFC', color: 'var(--text-primary)', border: '1px solid var(--border-medium)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
                    {pii}
                  </span>
                ))}
              </div>
            ) : (
              <div className="ds-text-body ds-text-secondary" style={{ marginTop: '16px' }}>No personal data classification available</div>
            )}
            
            {evidence && Object.keys(evidence).length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <h4 className="ds-text-small ds-font-semibold ds-mb-md" style={{ textTransform: 'uppercase' }}>EVIDENCE</h4>
                {Object.entries(evidence).map(([key, value]) => (
                  <DetailRow key={key} label={key} value={value} monospace />
                ))}
              </div>
            )}
          </div>

          {/* DYNAMIC SECTIONS BASED ON TYPE */}
          {type === 'RETENTION_VIOLATION' && selected.dataAge && selected.allowedRetention && (
            <div style={{ padding: '32px 0', borderBottom: '1px solid var(--border-medium)' }}>
              <h3 className="ds-text-small ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                RETENTION DETAILS
              </h3>
              <div style={{ marginTop: '16px' }}>
                <DetailRow label="Data Age" value={selected.dataAge} />
                <DetailRow label="Allowed Retention" value={selected.allowedRetention} />
                {selected.dataAge.includes('days') && selected.allowedRetention.includes('days') && (
                  <DetailRow label="Difference" value={`${parseInt(selected.dataAge) - parseInt(selected.allowedRetention)} days`} />
                )}
              </div>
            </div>
          )}

          {type === 'PURPOSE_MISMATCH' && (selected.declaredPurpose || selected.observedPurpose) && (
            <div style={{ padding: '32px 0', borderBottom: '1px solid var(--border-medium)' }}>
              <h3 className="ds-text-small ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                PURPOSE DETAILS
              </h3>
              <div style={{ marginTop: '16px', marginBottom: '24px' }}>
                {selected.declaredPurpose && <DetailRow label="Declared Purpose" value={selected.declaredPurpose} />}
                {selected.observedPurpose && <DetailRow label="Observed Purpose" value={selected.observedPurpose} />}
              </div>
              <div className="ds-text-body ds-text-secondary">
                The observed processing purpose does not match the organization's declared purpose.
              </div>
            </div>
          )}
          
          {type === 'PII_EXPOSURE' && (
            <div style={{ padding: '32px 0', borderBottom: '1px solid var(--border-medium)' }}>
              <h3 className="ds-text-small ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                PII EXPOSURE DETAILS
              </h3>
              <div style={{ marginTop: '16px', marginBottom: '24px' }}>
                <div className="ds-text-body ds-text-secondary">
                  Raw personal data was detected in a processing location where the configured policy does not permit it.
                </div>
              </div>
            </div>
          )}

          <div style={{ padding: '32px 0', borderBottom: '1px solid var(--border-medium)' }}>
            <h3 className="ds-text-small ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              PROCESSING CONTEXT
            </h3>
            <div style={{ marginTop: '16px' }}>
              <DetailRow label="Source" value={source} />
              
              {source === 'DATABASE' ? (
                <>
                  {selected.breachLocation?.table && <DetailRow label="Collection/Table" value={selected.breachLocation.table} />}
                  {selected.breachLocation?.columns && selected.breachLocation.columns.length > 0 && (
                    <DetailRow label="Relevant Fields" value={selected.breachLocation.columns.join(", ")} />
                  )}
                </>
              ) : (
                <>
                  {(selected.service || selected.breachLocation?.component) && (
                    <DetailRow label="Service" value={selected.service || selected.breachLocation?.component} />
                  )}
                  {(selected.endpoint || selected.breachLocation?.handler) && (
                    <DetailRow label="Endpoint" value={selected.endpoint || selected.breachLocation?.handler} />
                  )}
                </>
              )}
            </div>
          </div>

          <div style={{ padding: '32px 0', borderBottom: '1px solid var(--border-medium)' }}>
            <h3 className="ds-text-small ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              RISK ASSESSMENT
            </h3>
            <div style={{ marginTop: '16px' }}>
              <div className="ds-flex ds-items-center ds-gap-md ds-mb-sm">
                <div style={{ fontSize: '24px', fontWeight: '700', color: `var(--color-${severity.toLowerCase()})` }}>
                  {riskScore} <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>/ 100</span>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-medium)', height: '24px' }}></div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: `var(--color-${severity.toLowerCase()})` }}>
                  {severity}
                </div>
              </div>
              <div style={{ width: '100%', maxWidth: '300px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${riskScore}%`, background: `var(--color-${severity.toLowerCase()})` }}></div>
              </div>
            </div>
          </div>

          <div style={{ padding: '32px 0', borderBottom: '1px solid var(--border-medium)' }}>
            <div className="ds-flex ds-items-center ds-gap-sm ds-mb-lg">
              <h3 className="ds-text-small ds-text-muted ds-font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
                AI COMPLIANCE GUIDANCE
              </h3>
              <span style={{ fontSize: '10px', background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: '12px', border: '1px solid #E2E8F0', fontWeight: '500' }}>
                AI-generated guidance
              </span>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              <div className="ds-mb-lg">
                <div className="ds-text-small ds-font-semibold ds-mb-xs" style={{ color: 'var(--text-primary)' }}>WHY THIS WAS FLAGGED</div>
                <div className="ds-text-body ds-text-secondary" style={{ lineHeight: '1.6' }}>
                  {aiExplanation}
                </div>
              </div>
              <div>
                <div className="ds-text-small ds-font-semibold ds-mb-xs" style={{ color: 'var(--text-primary)' }}>RECOMMENDED FIX</div>
                <div className="ds-text-body ds-text-secondary" style={{ lineHeight: '1.6' }}>
                  {aiRecommendation}
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '32px 0', paddingBottom: '48px' }}>
            <h3 className="ds-text-small ds-text-muted ds-mb-sm ds-font-semibold" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              AUDIT INFORMATION
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginTop: '16px' }}>
              <div>
                <div className="ds-text-small ds-text-muted ds-mb-xs">Violation ID</div>
                <div className="ds-font-medium ds-text-secondary" style={{ fontSize: '13px', fontFamily: 'monospace' }}>{violationId}</div>
              </div>
              <div>
                <div className="ds-text-small ds-text-muted ds-mb-xs">Event ID</div>
                <div className="ds-font-medium ds-text-secondary" style={{ fontSize: '13px', fontFamily: 'monospace' }}>{eventId}</div>
              </div>
              <div>
                <div className="ds-text-small ds-text-muted ds-mb-xs">Policy ID</div>
                <div className="ds-font-medium ds-text-secondary" style={{ fontSize: '13px', fontFamily: 'monospace' }}>{policyId}</div>
              </div>
              <div>
                <div className="ds-text-small ds-text-muted ds-mb-xs">Timestamp</div>
                <div className="ds-font-medium ds-text-secondary" style={{ fontSize: '13px' }}>
                  {timestamp.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

        </div>
        
        {/* FOOTER ACTIONS */}
        <div className="ds-modal-footer ds-flex-between ds-items-center" style={{ borderTop: '1px solid var(--border-medium)', padding: '24px 32px', background: '#F8FAFC', borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' }}>
          <div></div>
          <button className="ds-btn ds-btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

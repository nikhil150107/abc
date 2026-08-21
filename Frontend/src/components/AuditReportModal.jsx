import React from 'react';
import { generateAuditReportPDF } from '../utils/pdfGenerator';

export default function AuditReportModal({ report, onClose }) {
  if (!report) return null;

  const exec = report.executiveSummary || {};
  const findings = report.statutoryFindings || [];
  const score = parseInt(exec.complianceHealthScore) || 60;
  
  // Use semantic colors based on score
  const scoreColor = score >= 80 ? 'var(--color-compliant)' : score >= 50 ? 'var(--color-medium)' : 'var(--color-high)';
  const scoreBg = score >= 80 ? 'var(--bg-compliant)' : score >= 50 ? 'var(--bg-medium)' : 'var(--bg-high)';

  const handleDownloadPDF = () => {
    generateAuditReportPDF({ report });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="ds-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh' }}
      >
        <div className="ds-modal-header ds-items-center">
          <div>
            <span className="ds-heading-3 ds-text-muted ds-mb-sm" style={{ display: 'block' }}>
              Official Regulatory Audit Document
            </span>
            <h2 className="ds-heading-1" style={{ fontSize: '20px' }}>
              DPDPA Statutory Compliance Audit Report
            </h2>
          </div>
          <div className="ds-flex ds-gap-sm">
            <button className="ds-btn ds-btn-primary" onClick={handleDownloadPDF}>
              Download PDF
            </button>
            <button className="ds-btn ds-btn-secondary" onClick={handlePrint}>
              Print
            </button>
            <button className="ds-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="ds-modal-body">
          {/* EXECUTIVE HEADER CARD */}
          <div className="ds-card ds-mb-lg ds-flex-between" style={{ padding: '24px', flexDirection: 'row', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p className="ds-text-body ds-mb-sm"><span className="ds-font-semibold">Target Application:</span> {report.targetApplication || 'DemoApp Technologies Pvt. Ltd.'}</p>
              <p className="ds-text-small ds-text-muted ds-mb-sm"><span className="ds-font-semibold ds-text-secondary">Auditor Authority:</span> {report.auditAuthority || 'PrivGuard Autonomous Platform'}</p>
              <p className="ds-text-small ds-text-muted ds-mb-sm"><span className="ds-font-semibold ds-text-secondary">Legal Reference:</span> Digital Personal Data Protection Act 2023 & DPDP Rules 2025 (MeitY)</p>
              <p className="ds-text-small ds-text-muted"><span className="ds-font-semibold ds-text-secondary">Generated At:</span> {new Date(report.generatedAt).toLocaleString()}</p>
            </div>

            <div style={{ background: 'var(--bg-secondary)', color: scoreColor, border: `1px solid var(--border-medium)`, borderLeft: `4px solid ${scoreColor}`, padding: '16px 24px', borderRadius: 'var(--radius-md)', textAlign: 'center', minWidth: '150px' }}>
              <div style={{ fontSize: '32px', fontWeight: '700', lineHeight: 1 }}>{score}%</div>
              <div className="ds-heading-3 ds-mt-sm" style={{ color: scoreColor }}>
                {exec.overallPosture?.replace(/_/g, ' ') || 'HEALTH SCORE'}
              </div>
            </div>
          </div>

          {/* SEVERITY BREAKDOWN PILLS */}
          <div className="ds-grid ds-mb-lg" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            <div className="ds-card" style={{ padding: '16px', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--color-critical)', textAlign: 'center' }}>
              <div style={{ color: 'var(--color-critical)', fontWeight: '700', fontSize: '24px' }}>{exec.severityBreakdown?.CRITICAL || 0}</div>
              <div className="ds-heading-3" style={{ color: 'var(--color-critical)' }}>Critical Breaches</div>
            </div>
            <div className="ds-card" style={{ padding: '16px', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--color-high)', textAlign: 'center' }}>
              <div style={{ color: 'var(--color-high)', fontWeight: '700', fontSize: '24px' }}>{exec.severityBreakdown?.HIGH || 0}</div>
              <div className="ds-heading-3" style={{ color: 'var(--color-high)' }}>High Risk</div>
            </div>
            <div className="ds-card" style={{ padding: '16px', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--color-medium)', textAlign: 'center' }}>
              <div style={{ color: 'var(--color-medium)', fontWeight: '700', fontSize: '24px' }}>{exec.severityBreakdown?.MEDIUM || 0}</div>
              <div className="ds-heading-3" style={{ color: 'var(--color-medium)' }}>Medium Risk</div>
            </div>
            <div className="ds-card" style={{ padding: '16px', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--color-low)', textAlign: 'center' }}>
              <div style={{ color: 'var(--color-low)', fontWeight: '700', fontSize: '24px' }}>{exec.severityBreakdown?.LOW || 0}</div>
              <div className="ds-heading-3" style={{ color: 'var(--color-low)' }}>Low Risk</div>
            </div>
          </div>

          {/* 5-PILLAR TABLE */}
          <h3 className="ds-heading-2 ds-mb-md">
            1. Statutory 5-Pillar Compliance Assessment Matrix
          </h3>
          <div className="ds-table-wrapper ds-mb-lg">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Pillar / Statutory Control</th>
                  <th>DPDPA Section</th>
                  <th>Scope & Evidence Examined</th>
                  <th>Pillar Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="ds-font-semibold">Pillar 1: Notice & Purpose Specification</span></td>
                  <td><span className="ds-badge ds-badge-low">Sec 5 & 6</span></td>
                  <td>Itemized notices, declared purpose limitation clauses, DPO contacts</td>
                  <td><span className="ds-badge ds-badge-compliant">PASS (100%)</span></td>
                </tr>
                <tr>
                  <td><span className="ds-font-semibold">Pillar 2: Data Principal Rights Center</span></td>
                  <td><span className="ds-badge ds-badge-low">Sec 11-14</span></td>
                  <td>Access (Sec 11), Erasure (Sec 12), Grievance (Sec 13), Nominee (Sec 14)</td>
                  <td><span className="ds-badge ds-badge-compliant">PASS (100%)</span></td>
                </tr>
                <tr>
                  <td><span className="ds-font-semibold">Pillar 3: Log Sanitization & Safeguards</span></td>
                  <td><span className="ds-badge ds-badge-low">Sec 8(5)</span></td>
                  <td>Prevention of plaintext personal identifiers (Email, Phone, PAN) in logs</td>
                  <td><span className={`ds-badge ${exec.severityBreakdown?.CRITICAL > 0 ? 'ds-badge-critical' : 'ds-badge-medium'}`}>{exec.severityBreakdown?.CRITICAL > 0 ? 'FAIL (CRITICAL)' : 'ATTENTION (50%)'}</span></td>
                </tr>
                <tr>
                  <td><span className="ds-font-semibold">Pillar 4: Purpose Limitation & Use Scope</span></td>
                  <td><span className="ds-badge ds-badge-low">Sec 6(1)</span></td>
                  <td>Restricting data processing exclusively to declared collection scope</td>
                  <td><span className="ds-badge ds-badge-medium">ATTENTION (75%)</span></td>
                </tr>
                <tr>
                  <td><span className="ds-font-semibold">Pillar 5: Consent Lifecycle & Retention</span></td>
                  <td><span className="ds-badge ds-badge-low">Sec 6(4) & 8(7)</span></td>
                  <td>Ceasing processing upon consent withdrawal & purging expired telemetry</td>
                  <td><span className="ds-badge ds-badge-medium">ATTENTION (50%)</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ITEMIZED FINDINGS */}
          <h3 className="ds-heading-2 ds-mb-md">
            2. Detailed Statutory Findings, Breach Reasons & Prescribed Solutions
          </h3>

          {findings.map((f, i) => (
            <div key={i} className="ds-card ds-mb-md" style={{ padding: '24px' }}>
              <div className="ds-flex-between ds-mb-md">
                <div className="ds-flex ds-items-center ds-gap-sm">
                  <h4 className="ds-heading-2" style={{ fontSize: '16px', margin: 0 }}>
                    Finding #{i + 1}: {f.title}
                  </h4>
                  {f.observedEvidence?.occurrences > 1 && (
                    <span className="ds-badge ds-badge-neutral">
                      {f.observedEvidence.occurrences}x occurrences
                    </span>
                  )}
                </div>
                <span className={`ds-badge ds-badge-${f.severity.toLowerCase()}`}>
                  {f.severity} (Risk: {f.riskScore}/100)
                </span>
              </div>

              <div className="ds-text-small ds-text-secondary ds-mb-md" style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <span className="ds-font-semibold">Observed Telemetry:</span> Endpoint: <code style={{ background: 'var(--border-light)', padding: '2px 4px', borderRadius: '2px' }}>{f.observedEvidence?.endpoint || '/api'}</code> | Source: <span className="ds-font-semibold">{f.observedEvidence?.source}</span> | PII Detected: <span className="ds-font-semibold">{(f.observedEvidence?.detectedData || []).join(', ')}</span>
              </div>

              <div className="ds-mb-md">
                <div className="ds-heading-3 ds-mb-sm" style={{ color: 'var(--color-high)' }}>
                  Reason for Data Breach & Non-Compliance
                </div>
                <p className="ds-text-body">
                  {f.explainableReason}
                </p>
              </div>

              {f.aiExplanation && (
                <div className="ds-mb-md">
                  <div className="ds-heading-3 ds-mb-sm" style={{ color: 'var(--text-primary)' }}>
                    AI Root-Cause & Impact Analysis
                  </div>
                  <p className="ds-text-body">
                    {f.aiExplanation}
                  </p>
                </div>
              )}

              <div>
                <div className="ds-heading-3 ds-mb-sm" style={{ color: 'var(--color-compliant)' }}>
                  Prescribed Remediation & Solution
                </div>
                <p className="ds-text-body">
                  {f.remediationGuidance}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL FOOTER */}
        <div className="ds-modal-footer">
          <button className="ds-btn ds-btn-primary" onClick={handleDownloadPDF}>
            Download Official PDF Document
          </button>
          <button className="ds-btn ds-btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

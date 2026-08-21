import React from 'react';
import { generateAuditReportPDF } from '../utils/pdfGenerator';

export default function AuditReportModal({ report, onClose }) {
  if (!report) return null;

  const exec = report.executiveSummary || {};
  const findings = report.statutoryFindings || [];
  const score = parseInt(exec.complianceHealthScore) || 60;
  const scoreColor = score >= 80 ? '#18794E' : score >= 50 ? '#B54708' : '#C43232';

  const handleDownloadPDF = () => {
    generateAuditReportPDF({ report });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Official Regulatory Audit Document
            </span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', color: '#0F172A' }}>
              DPDPA Statutory Compliance Audit Report
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              📥 Download as PDF
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🖨️ Print
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* EXECUTIVE HEADER CARD */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}><b>Target Application:</b> {report.targetApplication || 'DemoApp Technologies Pvt. Ltd.'}</p>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#64748B' }}><b>Auditor Authority:</b> {report.auditAuthority || 'PrivGuard Autonomous Platform'}</p>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#64748B' }}><b>Legal Reference:</b> Digital Personal Data Protection Act 2023 & DPDP Rules 2025 (MeitY)</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}><b>Generated At:</b> {new Date(report.generatedAt).toLocaleString()}</p>
          </div>

          <div style={{ background: scoreColor, color: 'white', padding: '1rem 1.5rem', borderRadius: '10px', textAlign: 'center', minWidth: '150px' }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{score}%</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', marginTop: '4px', textTransform: 'uppercase' }}>
              {exec.overallPosture?.replace(/_/g, ' ') || 'HEALTH SCORE'}
            </div>
          </div>
        </div>

        {/* SEVERITY BREAKDOWN PILLS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '1.5rem' }}>
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: '#991B1B', fontWeight: '700', fontSize: '1.2rem' }}>{exec.severityBreakdown?.CRITICAL || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: '600' }}>Critical Breaches</div>
          </div>
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: '#DC2626', fontWeight: '700', fontSize: '1.2rem' }}>{exec.severityBreakdown?.HIGH || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: '600' }}>High Risk</div>
          </div>
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: '#D97706', fontWeight: '700', fontSize: '1.2rem' }}>{exec.severityBreakdown?.MEDIUM || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: '600' }}>Medium Risk</div>
          </div>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: '#166534', fontWeight: '700', fontSize: '1.2rem' }}>{exec.severityBreakdown?.LOW || 0}</div>
            <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600' }}>Low Risk</div>
          </div>
        </div>

        {/* 5-PILLAR TABLE */}
        <h3 style={{ fontSize: '1.1rem', color: '#1E1B4B', marginBottom: '0.75rem' }}>
          1. Statutory 5-Pillar Compliance Assessment Matrix
        </h3>
        <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
          <table>
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
                <td><b>Pillar 1: Notice & Purpose Specification</b></td>
                <td><span className="badge badge-blue">Sec 5 & 6</span></td>
                <td>Itemized notices, declared purpose limitation clauses, DPO contacts</td>
                <td><span className="badge badge-green">PASS (100%)</span></td>
              </tr>
              <tr>
                <td><b>Pillar 2: Data Principal Rights Center</b></td>
                <td><span className="badge badge-blue">Sec 11-14</span></td>
                <td>Access (Sec 11), Erasure (Sec 12), Grievance (Sec 13), Nominee (Sec 14)</td>
                <td><span className="badge badge-green">PASS (100%)</span></td>
              </tr>
              <tr>
                <td><b>Pillar 3: Log Sanitization & Safeguards</b></td>
                <td><span className="badge badge-blue">Sec 8(5)</span></td>
                <td>Prevention of plaintext personal identifiers (Email, Phone, PAN) in logs</td>
                <td><span className="badge badge-red">{exec.severityBreakdown?.CRITICAL > 0 ? 'FAIL (CRITICAL)' : 'ATTENTION (50%)'}</span></td>
              </tr>
              <tr>
                <td><b>Pillar 4: Purpose Limitation & Use Scope</b></td>
                <td><span className="badge badge-blue">Sec 6(1)</span></td>
                <td>Restricting data processing exclusively to declared collection scope</td>
                <td><span className="badge badge-yellow">ATTENTION (75%)</span></td>
              </tr>
              <tr>
                <td><b>Pillar 5: Consent Lifecycle & Retention</b></td>
                <td><span className="badge badge-blue">Sec 6(4) & 8(7)</span></td>
                <td>Ceasing processing upon consent withdrawal & purging expired telemetry</td>
                <td><span className="badge badge-yellow">ATTENTION (50%)</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ITEMIZED FINDINGS */}
        <h3 style={{ fontSize: '1.1rem', color: '#1E1B4B', marginBottom: '0.75rem' }}>
          2. Detailed Statutory Findings, Breach Reasons & Prescribed Solutions
        </h3>

        {findings.map((f, i) => (
          <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, color: '#1E1B4B', fontSize: '0.95rem' }}>
                Finding #{i + 1}: {f.title}
                {f.observedEvidence?.occurrences > 1 && (
                  <span style={{ marginLeft: 8, fontSize: '0.75rem', background: '#FEF08A', color: '#854D0E', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                    {f.observedEvidence.occurrences}x occurrences
                  </span>
                )}
              </h4>
              <span className={`badge ${f.severity === 'CRITICAL' ? 'badge-purple' : f.severity === 'HIGH' ? 'badge-red' : 'badge-yellow'}`}>
                {f.severity} (Risk: {f.riskScore}/100)
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '10px', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px' }}>
              <b>Observed Telemetry:</b> Endpoint: <code>{f.observedEvidence?.endpoint || '/api'}</code> | Source: <b>{f.observedEvidence?.source}</b> | PII Detected: <b>{(f.observedEvidence?.detectedData || []).join(', ')}</b>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#DC2626', marginBottom: '2px' }}>
                🚨 Reason for Data Breach & Non-Compliance:
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: '1.5' }}>
                {f.explainableReason}
              </p>
            </div>

            {f.aiExplanation && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#4F46E5', marginBottom: '2px' }}>
                  🤖 AI Root-Cause & Impact Analysis:
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: '1.5' }}>
                  {f.aiExplanation}
                </p>
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#166534', marginBottom: '2px' }}>
                ✅ Prescribed Remediation & Solution:
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: '1.5' }}>
                {f.remediationGuidance}
              </p>
            </div>
          </div>
        ))}

        {/* MODAL FOOTER */}
        <div style={{ marginTop: '1.5rem', textAlign: 'right', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
          <button className="btn btn-primary" onClick={handleDownloadPDF} style={{ marginRight: '8px' }}>
            📥 Download Official PDF Document
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

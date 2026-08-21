const Violation = require('../models/Violation');
const Event = require('../models/Event');
const Policy = require('../models/Policy');
const AuditLog = require('../models/AuditLog');
const { detectPII } = require('../../event-processor/services/piiDetector');

let complianceEngine;
try {
  complianceEngine = require('../../guard-intelligence');
} catch (e) {
  console.warn('[audit-controller] guard-intelligence not loaded:', e.message);
}

const DEMOAPP_URL = process.env.DEMOAPP_URL || 'http://localhost:5001';

/**
 * Calculates a standard DPDPA Statutory Compliance Score based on 5 core statutory pillars:
 * 1. Privacy Notice & Specification of Purpose (DPDPA Sec 5 & 6) - 20 pts
 * 2. Data Principal Statutory Rights Framework (DPDPA Sec 11-14) - 20 pts
 * 3. Log Sanitization & Technical Safeguards (DPDPA Sec 8(5)) - 20 pts
 * 4. Purpose Limitation & Processing Scope (DPDPA Sec 6(1)) - 20 pts
 * 5. Consent Lifecycle & Storage Limitation (DPDPA Sec 6(4) & Sec 8(7)) - 20 pts
 */
const calculateComplianceScore = ({ hasNotice, hasRights, logFindings, purposeFindings, consentFindings, retentionFindings }) => {
  let score = 0;

  // Pillar 1: Notice & Transparency (20 pts)
  if (hasNotice) score += 20;

  // Pillar 2: Principal Rights Framework (20 pts)
  if (hasRights) score += 20;

  // Pillar 3: Log Sanitization & Safeguards (20 pts)
  const hasCriticalLog = logFindings.some(f => f.severity === 'CRITICAL');
  const hasHighLog = logFindings.some(f => f.severity === 'HIGH');
  if (!hasCriticalLog && !hasHighLog) {
    score += 20;
  } else if (!hasCriticalLog) {
    score += 10; // High PII (email/phone) detected
  } else {
    score += 0;  // Critical (PAN/Aadhaar) detected
  }

  // Pillar 4: Purpose Limitation (20 pts)
  if (purposeFindings.length === 0) {
    score += 20;
  } else {
    score += Math.max(0, 20 - (purposeFindings.length * 5));
  }

  // Pillar 5: Consent Lifecycle & Retention (20 pts)
  const hasConsentBreach = consentFindings.length > 0;
  const hasRetentionBreach = retentionFindings.length > 0;
  if (!hasConsentBreach && !hasRetentionBreach) {
    score += 20;
  } else if (!hasConsentBreach || !hasRetentionBreach) {
    score += 10;
  } else {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * POST /api/audit/scan-target
 * Runs an autonomous end-to-end DPDPA compliance audit on DemoApp (Target).
 */
const scanTargetApp = async (req, res) => {
  try {
    const io = req.app.get('io');

    // 1. Ingest consolidated 3-layer evidence from DemoApp
    const evidenceRes = await fetch(`${DEMOAPP_URL}/api/audit-feed/evidence`);
    if (!evidenceRes.ok) {
      return res.status(502).json({
        success: false,
        message: `Failed to connect to DemoApp at ${DEMOAPP_URL}. Is DemoApp running?`
      });
    }

    const { evidence } = await evidenceRes.json();
    const { policy = {}, events = [], logs = [], consents = [], users = [] } = evidence;

    // Reset previous target scan findings to avoid duplicate accumulation
    await Violation.deleteMany({ service: { $in: ['demoapp-core', 'demoapp-commerce', 'demoapp-marketing', 'demoapp-storage'] } });

    const detectedViolations = [];
    const logFindings = [];
    const purposeFindings = [];
    const consentFindings = [];
    const retentionFindings = [];

    // -------------------------------------------------------------------------
    // RULE 1: Inspect Application Logs for PII Leakage (DPDPA Sec 8(5))
    // Groups findings by distinct Action & Detected PII types
    // -------------------------------------------------------------------------
    const logGroupMap = new Map();

    for (const log of logs) {
      const rawText = `${log.message} ${JSON.stringify(log.rawLogData || {})}`;
      const piiFindings = detectPII(rawText);

      if (piiFindings.length > 0) {
        const detectedTypes = [...new Set(piiFindings.map(f => f.type))].sort();
        const groupKey = `${log.action || 'GENERAL_LOG'}:${detectedTypes.join('-')}`;

        if (!logGroupMap.has(groupKey)) {
          logGroupMap.set(groupKey, {
            action: log.action || 'GENERAL_LOG',
            detectedTypes,
            sampleLog: log,
            count: 1
          });
        } else {
          logGroupMap.get(groupKey).count++;
        }
      }
    }

    for (const [key, group] of logGroupMap.entries()) {
      const isCritical = group.detectedTypes.includes('PAN') || group.detectedTypes.includes('AADHAAR');
      const severity = isCritical ? 'CRITICAL' : 'HIGH';
      const riskScore = isCritical ? 95 : 85;

      const violationId = `VIO-LOG-${group.action}-${group.detectedTypes.join('_')}`;
      const violationDoc = {
        violationId,
        organizationId: 'ORG-001',
        applicationId: 'APP-DEMOAPP',
        eventId: group.sampleLog.logId || `LOG-${Date.now()}`,
        policyId: isCritical ? 'POL-003' : 'POL-001',
        type: 'PII_EXPOSURE',
        severity,
        riskScore,
        service: 'demoapp-core',
        source: 'APPLICATION_LOG',
        endpoint: group.action ? `/${group.action.toLowerCase()}` : '/app-logs',
        detectedData: group.detectedTypes,
        detectedPII: group.detectedTypes,
        occurrences: group.count,
        title: `Plaintext Personal Data (${group.detectedTypes.join(', ')}) in ${group.action} Logs`,
        reason: `Application log recorded unmasked personal data [${group.detectedTypes.join(', ')}] across ${group.count} log entries. DPDPA Section 8(5) mandates reasonable security safeguards to prevent unauthorized personal data exposure in log files.`,
        explanation: `Plaintext personal identifiers (${group.detectedTypes.join(', ')}) were written to application logs during ${group.action}, presenting an unauthorized exposure risk under DPDPA Section 8(5).`,
        recommendation: `Deploy Winston or Bunyan log-sanitization middleware to automatically redact raw personal identifiers before write operations. Replace sensitive log fields with pseudonymized tokens (e.g., UUID hashes).`,
        status: 'OPEN',
        timestamp: new Date().toISOString(),
        policy: {
          policyId: isCritical ? 'POL-003' : 'POL-001',
          rule: isCritical ? 'PAN_LOGGING_PROHIBITED' : 'EMAIL_LOGGING_PROHIBITED'
        }
      };

      await Violation.updateOne({ violationId }, { $set: violationDoc }, { upsert: true });
      detectedViolations.push(violationDoc);
      logFindings.push(violationDoc);
      if (io) io.emit('NEW_VIOLATION', violationDoc);
    }

    // -------------------------------------------------------------------------
    // RULE 2: Inspect Events for Purpose Mismatch (DPDPA Sec 6(1))
    // -------------------------------------------------------------------------
    const purposeMismatchEvents = events.filter(evt => {
      const fields = Array.isArray(evt.dataFields)
        ? evt.dataFields
        : typeof evt.dataFields === 'string'
        ? JSON.parse(evt.dataFields || '[]')
        : [];
      return fields.includes('mobileNumber') && (evt.eventType === 'USER_LOGIN' || evt.eventType === 'ORDER_CREATED');
    });

    if (purposeMismatchEvents.length > 0) {
      const violationId = 'VIO-PURPOSE-MOBILE-USE-MISMATCH';
      const sampleEvt = purposeMismatchEvents[0];
      const violationDoc = {
        violationId,
        organizationId: 'ORG-001',
        applicationId: 'APP-DEMOAPP',
        eventId: sampleEvt.eventId || `EVT-${Date.now()}`,
        policyId: 'POL-004',
        type: 'PURPOSE_MISMATCH',
        severity: 'HIGH',
        riskScore: 78,
        service: 'demoapp-commerce',
        source: 'API',
        endpoint: '/api/orders',
        detectedData: ['mobileNumber'],
        detectedPII: ['PHONE'],
        occurrences: purposeMismatchEvents.length,
        title: 'Purpose-Use Mismatch: Mobile Number Used Beyond Declared Scope',
        reason: `Declared purpose for mobileNumber in Data Inventory is 'OTP verification only', but observed in ${purposeMismatchEvents.length} order/login processing events. DPDPA Section 6(1) requires processing only for declared, specified purposes.`,
        explanation: `Customer mobile numbers collected under an OTP-only notice were subsequently used in commercial transaction processing without explicit secondary consent, violating DPDPA Section 6(1).`,
        recommendation: `Update the itemized privacy notice to declare transaction communications for mobile numbers, or decouple phone verification from order creation. Enforce consent checks before data use.`,
        status: 'OPEN',
        timestamp: new Date().toISOString(),
        policy: {
          policyId: 'POL-004',
          rule: 'PURPOSE_MISMATCH'
        }
      };

      await Violation.updateOne({ violationId }, { $set: violationDoc }, { upsert: true });
      detectedViolations.push(violationDoc);
      purposeFindings.push(violationDoc);
      if (io) io.emit('NEW_VIOLATION', violationDoc);
    }

    // -------------------------------------------------------------------------
    // RULE 3: Consent Enforcement: Marketing Post-Withdrawal (DPDPA Sec 6(4))
    // -------------------------------------------------------------------------
    const consentBreachEvents = events.filter(evt =>
      evt.eventType === 'MARKETING_PROCESSING' &&
      (evt.metadata?.trigger === 'POST_CONSENT_WITHDRAWAL' || evt.metadata?.note?.includes('CONSENT_ENFORCEMENT'))
    );

    if (consentBreachEvents.length > 0) {
      const violationId = 'VIO-CONSENT-MARKETING-POST-WITHDRAWAL';
      const sampleEvt = consentBreachEvents[0];
      const violationDoc = {
        violationId,
        organizationId: 'ORG-001',
        applicationId: 'APP-DEMOAPP',
        eventId: sampleEvt.eventId || `EVT-${Date.now()}`,
        policyId: 'POL-004',
        type: 'PURPOSE_MISMATCH',
        severity: 'CRITICAL',
        riskScore: 92,
        service: 'demoapp-marketing',
        source: 'EVENT_BUS',
        endpoint: '/marketing/process',
        detectedData: ['email', 'mobileNumber'],
        detectedPII: ['EMAIL', 'PHONE'],
        occurrences: consentBreachEvents.length,
        title: 'Consent Enforcement Failure: Marketing Processing Post-Withdrawal',
        reason: `Marketing processing event executed for user who previously triggered CONSENT_WITHDRAWN. Under DPDPA Section 6(4), Data Principal has the right to withdraw consent and processing must cease.`,
        explanation: `Marketing communications were processed for a user who had explicitly withdrawn consent, violating DPDPA Section 6(4) which mandates the cessation of processing upon withdrawal.`,
        recommendation: `Integrate real-time consent token checks in the marketing campaign runner to halt automated notifications immediately when a user withdraws consent.`,
        status: 'OPEN',
        timestamp: new Date().toISOString(),
        policy: {
          policyId: 'POL-004',
          rule: 'PURPOSE_MISMATCH'
        }
      };

      await Violation.updateOne({ violationId }, { $set: violationDoc }, { upsert: true });
      detectedViolations.push(violationDoc);
      consentFindings.push(violationDoc);
      if (io) io.emit('NEW_VIOLATION', violationDoc);
    }

    // -------------------------------------------------------------------------
    // RULE 4: Data Retention Exceeded (DPDPA Sec 8(7))
    // -------------------------------------------------------------------------
    const retentionBreachEvents = events.filter(evt => {
      const ageDays = Math.floor((Date.now() - new Date(evt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return evt.eventType === 'MARKETING_PROCESSING' && ageDays > 365;
    });

    if (retentionBreachEvents.length > 0) {
      const violationId = 'VIO-RETENTION-MARKETING-EXCEEDED';
      const sampleEvt = retentionBreachEvents[0];
      const ageDays = Math.floor((Date.now() - new Date(sampleEvt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const violationDoc = {
        violationId,
        organizationId: 'ORG-001',
        applicationId: 'APP-DEMOAPP',
        eventId: sampleEvt.eventId || `EVT-${Date.now()}`,
        policyId: 'POL-005',
        type: 'RETENTION_VIOLATION',
        severity: 'MEDIUM',
        riskScore: 65,
        service: 'demoapp-storage',
        source: 'DATABASE',
        endpoint: '/data-retention',
        detectedData: ['marketingData'],
        detectedPII: ['EMAIL'],
        occurrences: retentionBreachEvents.length,
        title: `Data Retention Threshold Exceeded (${ageDays} Days vs 365-Day Schedule)`,
        reason: `Marketing data record is ${ageDays} days old, exceeding declared statutory retention limit of 365 days. DPDPA Section 8(7) requires erasing personal data upon expiry of the specified purpose.`,
        explanation: `Marketing data records have been retained in active database storage for over 365 days, violating the purpose-based storage limitation under DPDPA Section 8(7).`,
        recommendation: `Configure an automated database TTL policy or a scheduled cron job to securely purge or anonymize marketing records older than 365 days.`,
        status: 'OPEN',
        timestamp: new Date().toISOString(),
        policy: {
          policyId: 'POL-005',
          rule: 'RETENTION_VIOLATION'
        }
      };

      await Violation.updateOne({ violationId }, { $set: violationDoc }, { upsert: true });
      detectedViolations.push(violationDoc);
      retentionFindings.push(violationDoc);
      if (io) io.emit('NEW_VIOLATION', violationDoc);
    }

    // 2. Compute holistic compliance score
    const hasNotice = Boolean(policy?.itemizedPurposes?.length > 0);
    const hasRights = Boolean(users.length > 0); // DemoApp provides active rights portal

    const complianceScore = calculateComplianceScore({
      hasNotice,
      hasRights,
      logFindings,
      purposeFindings,
      consentFindings,
      retentionFindings
    });

    // 3. Log Audit Trail
    await AuditLog.create({
      action: 'TARGET_AUDIT_COMPLETED',
      entity: 'AuditScan',
      entityId: `SCAN-${Date.now()}`,
      details: {
        target: 'DemoApp',
        scannedLogs: logs.length,
        scannedEvents: events.length,
        distinctViolations: detectedViolations.length,
        complianceScore
      }
    });

    return res.status(200).json({
      success: true,
      scanSummary: {
        scannedAt: new Date().toISOString(),
        target: 'DemoApp (http://localhost:5001)',
        scannedLogs: logs.length,
        scannedEvents: events.length,
        violationsDetected: detectedViolations.length,
        complianceScore
      },
      violations: detectedViolations
    });
  } catch (err) {
    console.error('[audit-controller] Audit scan failed:', err);
    return res.status(500).json({ success: false, message: 'Audit execution failed', error: err.message });
  }
};

/**
 * GET /api/audit/report
 * Generates an exportable comprehensive DPDPA Compliance & Risk Assessment Report.
 */
const exportAuditReport = async (req, res) => {
  try {
    const violations = await Violation.find().sort({ severity: 1, timestamp: -1 });
    const totalOpen = violations.filter(v => v.status === 'OPEN').length;
    const critical = violations.filter(v => v.severity === 'CRITICAL').length;
    const high = violations.filter(v => v.severity === 'HIGH').length;
    const medium = violations.filter(v => v.severity === 'MEDIUM').length;
    const low = violations.filter(v => v.severity === 'LOW').length;

    const complianceScore = calculateComplianceScore({
      hasNotice: true,
      hasRights: true,
      logFindings: violations.filter(v => v.source === 'APPLICATION_LOG'),
      purposeFindings: violations.filter(v => v.type === 'PURPOSE_MISMATCH'),
      consentFindings: violations.filter(v => v.title?.includes('Consent')),
      retentionFindings: violations.filter(v => v.type === 'RETENTION_VIOLATION')
    });

    const report = {
      title: 'Digital Personal Data Protection Act (DPDPA) Compliance Audit Report',
      auditAuthority: 'PrivGuard Autonomous Auditor Platform',
      targetApplication: 'DemoApp Technologies Pvt. Ltd.',
      generatedAt: new Date().toISOString(),
      statutoryFramework: 'Digital Personal Data Protection Act 2023 & DPDP Rules 2025 (MeitY)',
      executiveSummary: {
        overallPosture: complianceScore >= 80 ? 'SATISFACTORY' : complianceScore >= 50 ? 'REQUIRES_REMEDIATION' : 'CRITICAL_RISK',
        complianceHealthScore: `${complianceScore}%`,
        totalViolations: violations.length,
        openViolations: totalOpen,
        severityBreakdown: { CRITICAL: critical, HIGH: high, MEDIUM: medium, LOW: low }
      },
      statutoryFindings: violations.map((v, i) => ({
        index: i + 1,
        findingId: v.violationId,
        title: v.title,
        severity: v.severity,
        riskScore: v.riskScore,
        category: v.type,
        statutoryProvision: v.policy?.rule || 'DPDPA Core Rule',
        observedEvidence: {
          source: v.source,
          endpoint: v.endpoint,
          detectedData: v.detectedData || v.detectedPII,
          occurrences: v.occurrences || 1
        },
        explainableReason: v.reason,
        aiExplanation: v.explanation || v.aiExplanation,
        remediationGuidance: v.recommendation,
        status: v.status
      }))
    };

    return res.status(200).json({ success: true, report });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate report', error: err.message });
  }
};

module.exports = {
  scanTargetApp,
  exportAuditReport,
  calculateComplianceScore
};

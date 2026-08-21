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

    const { evidence, application } = await evidenceRes.json();
    const { inventory, policy, events = [], logs = [], consents = [], users = [] } = evidence;

    const detectedViolations = [];
    const scannedEvents = [];

    // -------------------------------------------------------------------------
    // RULE 1: Inspect Application Logs for PII Leakage (DPDPA Sec 8(5))
    // -------------------------------------------------------------------------
    for (const log of logs) {
      const rawText = `${log.message} ${JSON.stringify(log.rawLogData || {})}`;
      const piiFindings = detectPII(rawText);

      if (piiFindings.length > 0) {
        const detectedTypes = [...new Set(piiFindings.map(f => f.type))];
        const isCritical = detectedTypes.includes('PAN') || detectedTypes.includes('AADHAAR');
        const severity = isCritical ? 'CRITICAL' : 'HIGH';
        const riskScore = isCritical ? 95 : 85;

        const violationId = `VIO-LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const violationDoc = {
          violationId,
          organizationId: 'ORG-001',
          applicationId: 'APP-DEMOAPP',
          eventId: log.logId || `LOG-${Date.now()}`,
          policyId: isCritical ? 'POL-003' : 'POL-001',
          type: 'PII_EXPOSURE',
          severity,
          riskScore,
          service: 'demoapp-core',
          source: 'APPLICATION_LOG',
          endpoint: log.action ? `/${log.action.toLowerCase()}` : '/app-logs',
          detectedData: detectedTypes,
          detectedPII: detectedTypes,
          title: `Plaintext Personal Data (${detectedTypes.join(', ')}) Detected in Logs`,
          reason: `Application log recorded unmasked personal data fields [${detectedTypes.join(', ')}]. DPDPA Section 8(5) mandates reasonable security safeguards to prevent unnecessary data exposure.`,
          explanation: `Customer sensitive identifiers were written in plaintext to server logs (${log.action || 'system log'}). This creates exposure vulnerability in log management and observability tooling.`,
          recommendation: `Apply log-sanitization / masking middleware before writing logs. Ensure sensitive PII (${detectedTypes.join(', ')}) is redacted or hashed.`,
          status: 'OPEN',
          timestamp: log.createdAt || new Date().toISOString(),
          policy: {
            policyId: isCritical ? 'POL-003' : 'POL-001',
            rule: isCritical ? 'PAN_LOGGING_PROHIBITED' : 'EMAIL_LOGGING_PROHIBITED'
          }
        };

        // Save and push
        await Violation.updateOne({ violationId }, { $set: violationDoc }, { upsert: true });
        detectedViolations.push(violationDoc);
        if (io) io.emit('NEW_VIOLATION', violationDoc);
      }
    }

    // -------------------------------------------------------------------------
    // RULE 2: Inspect Events for Purpose Mismatch & Consent Withdrawal Failure
    // -------------------------------------------------------------------------
    for (const evt of events) {
      const dataFields = Array.isArray(evt.dataFields)
        ? evt.dataFields
        : typeof evt.dataFields === 'string'
        ? JSON.parse(evt.dataFields || '[]')
        : [];

      // Check Purpose Mismatch: Mobile declared for OTP only, but used in Login/Order
      if (
        dataFields.includes('mobileNumber') &&
        (evt.eventType === 'USER_LOGIN' || evt.eventType === 'ORDER_CREATED')
      ) {
        const violationId = `VIO-PURPOSE-${evt.eventId || Date.now()}`;
        const violationDoc = {
          violationId,
          organizationId: 'ORG-001',
          applicationId: 'APP-DEMOAPP',
          eventId: evt.eventId || `EVT-${Date.now()}`,
          policyId: 'POL-004',
          type: 'PURPOSE_MISMATCH',
          severity: 'HIGH',
          riskScore: 78,
          service: 'demoapp-commerce',
          source: 'API',
          endpoint: evt.eventType === 'USER_LOGIN' ? '/api/users/login' : '/api/orders',
          detectedData: ['mobileNumber'],
          detectedPII: ['PHONE'],
          title: 'Purpose-Use Mismatch: Mobile Number Used Beyond Declared Scope',
          reason: `Declared purpose for mobileNumber in Data Inventory is 'OTP verification only', but observed processing event is '${evt.eventType}'. DPDPA Section 6(1) requires processing only for declared, specified purposes.`,
          explanation: 'Personal data collected under a specific notice (OTP verification) was subsequently processed in general business operations without separate lawful basis.',
          recommendation: 'Update privacy notice to declare order/login processing for mobile numbers or decouple mobile verification from order records.',
          status: 'OPEN',
          timestamp: evt.createdAt || new Date().toISOString(),
          policy: {
            policyId: 'POL-004',
            rule: 'PURPOSE_MISMATCH'
          }
        };

        await Violation.updateOne({ violationId }, { $set: violationDoc }, { upsert: true });
        detectedViolations.push(violationDoc);
        if (io) io.emit('NEW_VIOLATION', violationDoc);
      }

      // Check Consent Enforcement: Marketing processing post consent withdrawal
      if (
        evt.eventType === 'MARKETING_PROCESSING' &&
        (evt.metadata?.trigger === 'POST_CONSENT_WITHDRAWAL' || evt.metadata?.note?.includes('CONSENT_ENFORCEMENT'))
      ) {
        const violationId = `VIO-CONSENT-${evt.eventId || Date.now()}`;
        const violationDoc = {
          violationId,
          organizationId: 'ORG-001',
          applicationId: 'APP-DEMOAPP',
          eventId: evt.eventId || `EVT-${Date.now()}`,
          policyId: 'POL-004',
          type: 'PURPOSE_MISMATCH',
          severity: 'CRITICAL',
          riskScore: 92,
          service: 'demoapp-marketing',
          source: 'EVENT_BUS',
          endpoint: '/marketing/process',
          detectedData: ['email', 'mobileNumber'],
          detectedPII: ['EMAIL', 'PHONE'],
          title: 'Consent Enforcement Failure: Marketing Continued Post-Withdrawal',
          reason: `Marketing processing event executed for user who previously triggered CONSENT_WITHDRAWN. Under DPDPA Section 6(4), Data Principal has the right to withdraw consent and processing must cease within reasonable time.`,
          explanation: 'Marketing automation service continues dispatching campaigns even after the user revoked consent in their privacy preferences.',
          recommendation: 'Implement real-time consent verification gate before initiating any marketing campaign dispatches.',
          status: 'OPEN',
          timestamp: evt.createdAt || new Date().toISOString(),
          policy: {
            policyId: 'POL-004',
            rule: 'PURPOSE_MISMATCH'
          }
        };

        await Violation.updateOne({ violationId }, { $set: violationDoc }, { upsert: true });
        detectedViolations.push(violationDoc);
        if (io) io.emit('NEW_VIOLATION', violationDoc);
      }

      // Check Retention Period Exceeded (>365 days for marketing)
      const eventAgeDays = Math.floor((Date.now() - new Date(evt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (evt.eventType === 'MARKETING_PROCESSING' && eventAgeDays > 365) {
        const violationId = `VIO-RETENTION-${evt.eventId || Date.now()}`;
        const violationDoc = {
          violationId,
          organizationId: 'ORG-001',
          applicationId: 'APP-DEMOAPP',
          eventId: evt.eventId || `EVT-${Date.now()}`,
          policyId: 'POL-005',
          type: 'RETENTION_VIOLATION',
          severity: 'MEDIUM',
          riskScore: 65,
          service: 'demoapp-storage',
          source: 'DATABASE',
          endpoint: '/data-retention',
          detectedData: ['marketingData'],
          detectedPII: ['EMAIL'],
          title: `Data Retention Exceeded: Record Age (${eventAgeDays} days) Exceeds 365-Day Schedule`,
          reason: `Marketing data record is ${eventAgeDays} days old, exceeding declared retention limit of 365 days. DPDPA Section 8(7) requires erasing personal data upon expiry of the specified purpose.`,
          explanation: 'Outdated marketing telemetry remains stored in application database without automated purging lifecycle.',
          recommendation: 'Implement automated data purge cron or database TTL index to delete marketing records after 365 days.',
          status: 'OPEN',
          timestamp: evt.createdAt || new Date().toISOString(),
          policy: {
            policyId: 'POL-005',
            rule: 'RETENTION_VIOLATION'
          }
        };

        await Violation.updateOne({ violationId }, { $set: violationDoc }, { upsert: true });
        detectedViolations.push(violationDoc);
        if (io) io.emit('NEW_VIOLATION', violationDoc);
      }
    }

    // 2. Audit Trail logging
    await AuditLog.create({
      action: 'TARGET_AUDIT_COMPLETED',
      entity: 'AuditScan',
      entityId: `SCAN-${Date.now()}`,
      details: {
        target: 'DemoApp',
        scannedLogs: logs.length,
        scannedEvents: events.length,
        violationsFound: detectedViolations.length
      }
    });

    // 3. Compute overall compliance score
    const totalOpen = await Violation.countDocuments({ status: 'OPEN' });
    const complianceScore = Math.max(0, 100 - (totalOpen * 3));

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

    const complianceScore = Math.max(0, 100 - (totalOpen * 3));

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
          detectedData: v.detectedData || v.detectedPII
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
  exportAuditReport
};

/**
 * CONTRACT 3 — COMPLIANCE RESULT / VIOLATION OBJECT
 * Flow: Member 3 (Compliance Engine) → Member 4 (Storage + Dashboard)
 */

const VIOLATION_TYPES = ['PII_EXPOSURE', 'PURPOSE_MISMATCH', 'RETENTION_VIOLATION'];
const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VIOLATION_STATUS = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

function createCompliantResult(eventId, { policyId = 'POL-001', timestamp = new Date().toISOString() } = {}) {
  return {
    eventId,
    compliance: {
      status: 'COMPLIANT',
      policyId,
      violations: [],
    },
    timestamp,
  };
}

function createViolation({
  violationId,
  eventId,
  type,
  severity = 'HIGH',
  riskScore = 75,
  source,
  service,
  endpoint,
  detectedPII = [],
  policy = {},
  explanation = '',
  recommendation = '',
  status = 'OPEN',
  timestamp = new Date().toISOString(),
}) {
  return {
    violationId: violationId || `V-${Date.now()}`,
    eventId,
    type,
    severity,
    riskScore,
    source,
    service,
    endpoint,
    detectedPII,
    policy,
    explanation,
    recommendation,
    status,
    timestamp,
  };
}

function validateViolation(violation) {
  const errors = [];
  if (!violation.violationId) errors.push('violationId is required');
  if (!violation.eventId) errors.push('eventId is required');
  if (!violation.type) errors.push('type is required');
  if (!VIOLATION_TYPES.includes(violation.type)) errors.push(`type must be one of: ${VIOLATION_TYPES.join(', ')}`);
  return { valid: errors.length === 0, errors };
}

module.exports = {
  VIOLATION_TYPES,
  SEVERITY_LEVELS,
  VIOLATION_STATUS,
  createCompliantResult,
  createViolation,
  validateViolation,
};

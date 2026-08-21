/**
 * @file risk.service.js
 * @description Service for calculating deterministic risk scores for detected violations.
 */

const SEVERITY_BASE_SCORES = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 95,
};

const HIGH_SENSITIVITY_PII = new Set(["AADHAAR", "PAN", "BANK_ACCOUNT", "PASSPORT"]);

/**
 * Calculates a 0-100 risk score based on severity, violation type, and metadata context.
 * 
 * @param {string} severity - Severity level: LOW, MEDIUM, HIGH, CRITICAL.
 * @param {string} type - Violation type: PII_EXPOSURE, PURPOSE_MISMATCH, RETENTION_VIOLATION.
 * @param {Object} [metadata={}] - Contextual details (e.g. detectedData, eventDetectedPII, source).
 * @returns {number} Deterministic risk score capped between 0 and 100.
 */
function calculateRisk(severity, type, metadata = {}) {
  const normSeverity = (severity || "LOW").toUpperCase();
  let score = SEVERITY_BASE_SCORES[normSeverity] ?? SEVERITY_BASE_SCORES.LOW;

  const detectedData = metadata.detectedData || [];
  const eventPII = metadata.eventDetectedPII || detectedData;
  const source = metadata.source;

  // Booster 1: Multiple PII fields present in event context
  if (Array.isArray(eventPII) && eventPII.length > 1) {
    score += 5;
  }

  // Booster 2: High sensitivity PII types present
  if (Array.isArray(eventPII) && eventPII.some((p) => HIGH_SENSITIVITY_PII.has(String(p).toUpperCase()))) {
    score += 5;
  }

  // Booster 3: Unprotected raw application log exposure
  if (source === "APPLICATION_LOG" && type === "PII_EXPOSURE") {
    score += 5;
  }

  // Ensure risk score is strictly bounded between 0 and 100
  return Math.min(100, Math.max(0, score));
}

module.exports = {
  calculateRisk,
};

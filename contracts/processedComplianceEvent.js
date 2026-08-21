/**
 * CONTRACT 2 — PROCESSED COMPLIANCE EVENT
 * Flow: Member 2 (Event Processor) → Member 3 (Compliance Engine)
 *
 * Enriched with PII detection and context. No compliance decisions.
 */

const PII_TYPES = ['EMAIL', 'PHONE', 'PAN', 'AADHAAR', 'ADDRESS'];
const DATA_CLASSIFICATIONS = ['PERSONAL_DATA', 'NON_PERSONAL_DATA', 'SENSITIVE_DATA'];

function createProcessedEvent(rawEvent, { detectedPII = [], dataClassification = 'NON_PERSONAL_DATA' } = {}) {
  return {
    eventId: rawEvent.eventId,
    source: rawEvent.source,
    service: rawEvent.service,
    eventType: rawEvent.eventType,
    endpoint: rawEvent.endpoint,
    method: rawEvent.method,
    timestamp: rawEvent.timestamp,
    context: rawEvent.context || {},
    pii: {
      piiDetected: detectedPII.length > 0,
      detectedPII,
    },
    dataClassification,
  };
}

function validateProcessedEvent(event) {
  const errors = [];
  if (!event.eventId) errors.push('eventId is required');
  if (!event.pii || typeof event.pii.piiDetected !== 'boolean') errors.push('pii.piiDetected is required');
  if (!Array.isArray(event.pii?.detectedPII)) errors.push('pii.detectedPII must be an array');
  if (event.compliance !== undefined) errors.push('Member 2 must NOT include compliance');
  return { valid: errors.length === 0, errors };
}

module.exports = { PII_TYPES, DATA_CLASSIFICATIONS, createProcessedEvent, validateProcessedEvent };

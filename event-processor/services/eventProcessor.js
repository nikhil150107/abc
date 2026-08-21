const { validateRawEvent } = require('../../contracts/rawApplicationEvent');
const { createProcessedEvent } = require('../../contracts/processedComplianceEvent');
const { detectPII } = require('./piiDetector');

function normalizeEvent(rawEvent) {
  return {
    eventId: rawEvent.eventId,
    source: rawEvent.source?.toUpperCase() || 'API',
    service: rawEvent.service || 'unknown-service',
    eventType: rawEvent.eventType,
    endpoint: rawEvent.endpoint || '/unknown',
    method: rawEvent.method || 'POST',
    timestamp: rawEvent.timestamp || new Date().toISOString(),
    payload: rawEvent.payload || {},
    context: {
      purpose: rawEvent.context?.purpose || 'UNKNOWN',
      ...rawEvent.context,
    },
  };
}

function extractContext(normalizedEvent, detectedPII) {
  const dataClassification =
    detectedPII.length > 0
      ? detectedPII.some((p) => ['PAN', 'AADHAAR'].includes(p.type))
        ? 'SENSITIVE_DATA'
        : 'PERSONAL_DATA'
      : 'NON_PERSONAL_DATA';

  return {
    purpose: normalizedEvent.context.purpose,
    endpoint: normalizedEvent.endpoint,
    source: normalizedEvent.source,
    dataType: detectedPII.map((p) => p.type),
    dataClassification,
    processedAt: new Date().toISOString(),
  };
}

function processEvent(rawEvent) {
  const validation = validateRawEvent(rawEvent);
  if (!validation.valid) {
    throw new Error(`Invalid raw event: ${validation.errors.join(', ')}`);
  }

  const normalized = normalizeEvent(rawEvent);
  const detectedPII = detectPII(normalized.payload);
  const contextMeta = extractContext(normalized, detectedPII);

  const processed = createProcessedEvent(normalized, {
    detectedPII: detectedPII.map(({ type, field, maskedValue }) => ({ type, field, maskedValue })),
    dataClassification: contextMeta.dataClassification,
  });

  processed.context = {
    ...processed.context,
    ...contextMeta,
  };

  return processed;
}

module.exports = { normalizeEvent, extractContext, processEvent };

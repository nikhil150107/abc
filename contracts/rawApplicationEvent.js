/**
 * CONTRACT 1 — RAW APPLICATION EVENT
 * Flow: Member 1 (Organization App) → Member 2 (Event Processor)
 *
 * Member 1 ONLY reports what happened. No PII detection, compliance, or violations.
 */

const SOURCES = ['API', 'APPLICATION_LOG', 'MONGODB_CHANGE'];
const EVENT_TYPES = [
  'USER_LOGIN',
  'USER_REGISTERED',
  'ORDER_CREATED',
  'MARKETING_SUBSCRIBE',
  'PROFILE_VIEWED',
  'DATA_UPDATED',
  'DATA_DELETED',
];

function createRawEvent({
  eventId,
  source = 'API',
  service = 'organization-app',
  eventType,
  endpoint,
  method = 'POST',
  timestamp = new Date().toISOString(),
  payload = {},
  context = {},
}) {
  return {
    eventId: eventId || `EVT-${Date.now()}`,
    source,
    service,
    eventType,
    endpoint,
    method,
    timestamp,
    payload,
    context,
  };
}

function validateRawEvent(event) {
  const errors = [];
  if (!event.eventId) errors.push('eventId is required');
  if (!event.source) errors.push('source is required');
  if (!SOURCES.includes(event.source)) errors.push(`source must be one of: ${SOURCES.join(', ')}`);
  if (!event.eventType) errors.push('eventType is required');
  if (!event.timestamp) errors.push('timestamp is required');
  if (event.piiDetected !== undefined) errors.push('Member 1 must NOT include piiDetected');
  if (event.compliance !== undefined) errors.push('Member 1 must NOT include compliance');
  if (event.violation !== undefined) errors.push('Member 1 must NOT include violation');
  return { valid: errors.length === 0, errors };
}

module.exports = { SOURCES, EVENT_TYPES, createRawEvent, validateRawEvent };

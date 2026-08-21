// Run: node demo.js
// Fires events + violations in sequence to test real-time dashboard

const BASE = 'http://localhost:5000';
const uid  = () => Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const post = async (path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log(`POST ${path} →`, res.status, json.success ? '✅' : '❌', json.message || '');
};

const makeData = () => {
  const e1 = `EVT-${uid()}`, e2 = `EVT-${uid()}`, e3 = `EVT-${uid()}`, e4 = `EVT-${uid()}`;

  const EVENTS = [
    { eventId: e1, type: 'API_REQUEST',     source: 'API',              service: 'auth-service',      endpoint: '/login',      payload: { email: 'user@example.com' } },
    { eventId: e2, type: 'APPLICATION_LOG', source: 'APPLICATION_LOG',  service: 'order-service',     endpoint: '/api/orders', payload: { email: 'customer@example.com', phone: '9876543210' } },
    { eventId: e3, type: 'DB_CHANGE',       source: 'MONGODB',          service: 'user-service',      endpoint: '/users',      payload: { pan: 'ABCDE1234F' } },
    { eventId: e4, type: 'API_REQUEST',     source: 'API',              service: 'marketing-service', endpoint: '/marketing',  payload: { email: 'lead@example.com' } },
  ];

  const VIOLATIONS = [
    {
      violationId: `V-${uid()}`, eventId: e2,
      type: 'PII_EXPOSURE', severity: 'HIGH', riskScore: 87,
      source: 'APPLICATION_LOG', service: 'order-service', endpoint: '/api/orders',
      detectedPII: ['EMAIL', 'PHONE'],
      policy: { policyId: 'POL-001', rule: 'EMAIL_LOGGING_PROHIBITED' },
      explanation: 'Customer email and phone were detected in application logs even though the configured policy prohibits logging personal data.',
      recommendation: 'Mask or remove the email and phone number before writing application logs. Use a log sanitizer middleware.',
      status: 'OPEN', timestamp: new Date().toISOString(),
    },
    {
      violationId: `V-${uid()}`, eventId: e4,
      type: 'PURPOSE_MISMATCH', severity: 'HIGH', riskScore: 75,
      source: 'API', service: 'marketing-service', endpoint: '/marketing',
      detectedPII: ['EMAIL'],
      policy: { policyId: 'POL-004', rule: 'PURPOSE_MISMATCH' },
      explanation: 'Email collected during authentication is being used for marketing purposes, which was not the declared purpose at the time of collection.',
      recommendation: 'Obtain explicit consent before using personal data for marketing. Separate authentication and marketing data pipelines.',
      status: 'OPEN', timestamp: new Date().toISOString(),
    },
    {
      violationId: `V-${uid()}`, eventId: e3,
      type: 'PII_EXPOSURE', severity: 'CRITICAL', riskScore: 95,
      source: 'MONGODB', service: 'user-service', endpoint: '/users',
      detectedPII: ['PAN'],
      policy: { policyId: 'POL-003', rule: 'PAN_LOGGING_PROHIBITED' },
      explanation: 'A PAN card number was detected in a MongoDB document that is accessible without encryption or masking.',
      recommendation: 'Encrypt PAN numbers at rest. Apply field-level encryption in MongoDB and restrict access to sensitive fields.',
      status: 'OPEN', timestamp: new Date().toISOString(),
    },
  ];

  return { EVENTS, VIOLATIONS };
};

(async () => {
  const { EVENTS, VIOLATIONS } = makeData();
  console.log('\n🚀 PrivGuard Demo — firing events + violations\n');

  for (const event of EVENTS) {
    await post('/api/events', event);
    await delay(800);
  }

  console.log('\n⚠️  Firing violations...\n');
  await delay(1000);

  for (const violation of VIOLATIONS) {
    await post('/api/violations', violation);
    await delay(1200);
  }

  console.log('\n✅ Demo complete — check your dashboard!\n');
})();

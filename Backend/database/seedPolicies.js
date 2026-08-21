const Policy = require('../models/Policy');

const DEFAULT_POLICIES = [
  {
    policyId:    'POL-001',
    name:        'Email Logging Prohibited',
    rule:        'EMAIL_LOGGING_PROHIBITED',
    description: 'Email addresses must not appear in application logs.',
    severity:    'HIGH',
  },
  {
    policyId:    'POL-002',
    name:        'Phone Logging Prohibited',
    rule:        'PHONE_LOGGING_PROHIBITED',
    description: 'Phone numbers must not appear in application logs.',
    severity:    'HIGH',
  },
  {
    policyId:    'POL-003',
    name:        'PAN Logging Prohibited',
    rule:        'PAN_LOGGING_PROHIBITED',
    description: 'PAN card numbers must not appear in application logs.',
    severity:    'CRITICAL',
  },
  {
    policyId:    'POL-004',
    name:        'Purpose Mismatch',
    rule:        'PURPOSE_MISMATCH',
    description: 'Data must only be used for its declared purpose.',
    severity:    'HIGH',
  },
  {
    policyId:    'POL-005',
    name:        'Retention Violation',
    rule:        'RETENTION_VIOLATION',
    description: 'Personal data must not be retained beyond the allowed period.',
    severity:    'MEDIUM',
  },
  {
    policyId:    'POL-006',
    name:        'Aadhaar Logging Prohibited',
    rule:        'AADHAAR_LOGGING_PROHIBITED',
    description: 'Aadhaar-like identifiers must not appear in logs.',
    severity:    'CRITICAL',
  },
];

const seedPolicies = async () => {
  for (const policy of DEFAULT_POLICIES) {
    await Policy.updateOne(
      { policyId: policy.policyId },
      { $setOnInsert: policy },
      { upsert: true }
    );
  }
  console.log('Default policies seeded.');
};

module.exports = seedPolicies;

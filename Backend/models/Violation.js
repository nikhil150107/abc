const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  violationId: { type: String, required: true, unique: true, index: true },
  eventId:     { type: String, required: true, index: true },
  title:       { type: String },
  reason:      { type: String },
  type:        { type: String, required: true },
  severity:    { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true, index: true },
  riskScore:   { type: Number, required: true },
  source:      { type: String },
  service:     { type: String },
  endpoint:    { type: String },
  detectedPII:  [{ type: String }],
  detectedData: [{ type: String }],
  breachLocation: {
    originType:    { type: String }, // DATABASE_TABLE, APPLICATION_LOG, API_ENDPOINT, CONSENT_STORE
    table:         { type: String }, // e.g. users, application_audit_logs, orders, data_processing_events
    columns:       [{ type: String }], // e.g. ['shippingAddress', 'mobileNumber']
    endpoint:      { type: String },
    handler:       { type: String },
    component:     { type: String },
    codeReference: { type: String },
  },
  evidence:     { type: mongoose.Schema.Types.Mixed, default: {} },
  occurrences:  { type: Number, default: 1 },
  policy: {
    policyId: String,
    rule:     String,
  },
  explanation:    { type: String },
  recommendation: { type: String },
  status:         { type: String, enum: ['OPEN', 'RESOLVED', 'IGNORED'], default: 'OPEN', index: true },
  timestamp:      { type: Date, default: Date.now, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Violation', violationSchema);

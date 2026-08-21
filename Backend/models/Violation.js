const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  violationId: { type: String, required: true, unique: true, index: true },
  eventId:     { type: String, required: true, index: true },
  type:        { type: String, required: true },
  severity:    { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true, index: true },
  riskScore:   { type: Number, required: true },
  source:      { type: String },
  service:     { type: String },
  endpoint:    { type: String },
  detectedPII: [{ type: String }],
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

const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  policyId:    { type: String, required: true, unique: true, index: true },
  name:        { type: String, required: true },
  rule:        { type: String, required: true },
  description: { type: String },
  severity:    { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  enabled:     { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Policy', policySchema);

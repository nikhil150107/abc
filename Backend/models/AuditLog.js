const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action:    { type: String, required: true },
  entity:    { type: String },
  entityId:  { type: String },
  details:   { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);

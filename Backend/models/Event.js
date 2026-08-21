const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventId:   { type: String, required: true, unique: true, index: true },
  type:      { type: String, required: true, index: true },
  source:    { type: String },
  service:   { type: String },
  endpoint:  { type: String },
  payload:   { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);

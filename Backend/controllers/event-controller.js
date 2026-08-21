const Event = require('../models/Event');
const { processEvent } = require('../../Member 3');

// POST /api/events — Member 2 sends normalized events here
const createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);

    const io = req.app.get('io');
    if (io) io.emit('NEW_EVENT', event);

    // Member 3 Core Intelligence Pipeline (Policy -> Violation -> Risk -> AI)
    let violations = [];
    try {
      violations = await processEvent(event.toObject ? event.toObject() : event);
      if (violations && violations.length > 0 && io) {
        violations.forEach((v) => io.emit('NEW_VIOLATION', v));
      }
    } catch (complianceErr) {
      console.warn('[event-controller] Member 3 processing warning:', complianceErr.message);
    }

    res.status(201).json({
      success: true,
      data: event,
      violationsCount: violations.length,
      violations: violations,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Event already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/events
const getEvents = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const events = await Event.find().sort({ timestamp: -1 }).limit(Number(limit));
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createEvent, getEvents };

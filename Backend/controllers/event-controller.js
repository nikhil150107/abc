const Event = require('../models/Event');

// POST /api/events — Member 2 sends normalized events here
const createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);

    const io = req.app.get('io');
    if (io) io.emit('NEW_EVENT', event);

    res.status(201).json({ success: true, data: event });
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

const Event = require('../models/Event');
const { detectPII } = require('../../event-processor/services/piiDetector');

let processEvent;
try {
  processEvent = require('../../guard-intelligence').processEvent;
} catch (e) {
  try {
    processEvent = require('../../Member 3').processEvent;
  } catch (_) {
    console.warn('[event-controller] guard-intelligence module not found');
  }
}

// POST /api/events — Ingests real-time events from DemoApp & event-processor
const createEvent = async (req, res) => {
  try {
    const rawBody = req.body;
    const now = new Date();

    // Guarantee fresh current timestamp if not supplied or invalid
    const timestamp = rawBody.timestamp ? new Date(rawBody.timestamp) : now;

    // Detect PII from payload if not already provided
    let detectedPII = rawBody.detectedPII || [];
    if (!detectedPII.length && rawBody.payload) {
      const piiFindings = detectPII(rawBody.payload);
      detectedPII = [...new Set(piiFindings.map(f => f.type))];
    }

    // Also check if payload.dataFields contains PII identifiers
    if (rawBody.payload?.dataFields && Array.isArray(rawBody.payload.dataFields)) {
      const fields = rawBody.payload.dataFields.map(f => String(f).toLowerCase());
      if (fields.some(f => f.includes('email'))) detectedPII.push('EMAIL');
      if (fields.some(f => f.includes('mobile') || f.includes('phone'))) detectedPII.push('PHONE');
      if (fields.some(f => f.includes('pan'))) detectedPII.push('PAN');
      if (fields.some(f => f.includes('aadhaar'))) detectedPII.push('AADHAAR');
      detectedPII = [...new Set(detectedPII)];
    }

    const eventData = {
      eventId:   rawBody.eventId || `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      type:      rawBody.type || rawBody.eventType || 'DATA_PROCESSING_EVENT',
      source:    rawBody.source || 'DEMOAPP_API',
      service:   rawBody.service || 'demoapp-core',
      endpoint:  rawBody.endpoint || '/api',
      payload:   rawBody.payload || {},
      timestamp: timestamp,
    };

    const event = await Event.create(eventData);

    const io = req.app.get('io');
    if (io) {
      io.emit('NEW_EVENT', {
        ...event.toObject(),
        timestamp: timestamp.toISOString()
      });
    }

    // Member 3 Core Intelligence Pipeline (Policy -> Violation -> Risk -> AI)
    let violations = [];
    try {
      if (processEvent) {
        const compliancePayload = {
          ...event.toObject(),
          detectedPII,
          purpose: rawBody.payload?.purpose || rawBody.purpose || event.payload?.purpose,
          source: rawBody.source || 'APPLICATION_LOG',
          timestamp: timestamp.toISOString(),
          dataAgeDays: rawBody.payload?.dataAgeDays || 0,
        };

        violations = await processEvent(compliancePayload);
        if (violations && violations.length > 0 && io) {
          violations.forEach((v) => {
            io.emit('NEW_VIOLATION', {
              ...v,
              timestamp: timestamp.toISOString()
            });
          });
        }
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

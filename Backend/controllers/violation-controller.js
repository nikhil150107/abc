const Violation = require('../models/Violation');
const AuditLog  = require('../models/AuditLog');

// POST /api/violations — Member 3 sends violation here
const createViolation = async (req, res) => {
  try {
    const data = req.body;
    const violation = await Violation.create(data);

    await AuditLog.create({
      action:   'VIOLATION_CREATED',
      entity:   'Violation',
      entityId: violation.violationId,
      details:  { severity: violation.severity, type: violation.type },
    });

    // Emit real-time event via Socket.IO
    const io = req.app.get('io');
    if (io) io.emit('NEW_VIOLATION', violation);

    res.status(201).json({ success: true, data: violation });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Violation already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/violations — list with optional filters
const getViolations = async (req, res) => {
  try {
    const { severity, status, limit = 50 } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (status)   filter.status   = status;

    const violations = await Violation.find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({ success: true, data: violations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/violations/:id
const getViolationById = async (req, res) => {
  try {
    const violation = await Violation.findOne({ violationId: req.params.id });
    if (!violation) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: violation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/violations/stats/summary — dashboard overview
const getStats = async (req, res) => {
  try {
    const [total, high, medium, low, open] = await Promise.all([
      Violation.countDocuments(),
      Violation.countDocuments({ severity: 'HIGH' }),
      Violation.countDocuments({ severity: 'MEDIUM' }),
      Violation.countDocuments({ severity: 'LOW' }),
      Violation.countDocuments({ status: 'OPEN' }),
    ]);

    const totalEvents = await require('../models/Event').countDocuments();

    // Simple compliance score: 100 - (open violations * 2), min 0
    const complianceScore = Math.max(0, 100 - open * 2);

    res.json({
      success: true,
      data: { total, high, medium, low, open, totalEvents, complianceScore },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createViolation, getViolations, getViolationById, getStats };

const Violation = require('../models/Violation');
const Event     = require('../models/Event');
const AuditLog  = require('../models/AuditLog');

// POST /api/violations — Member 3 sends violation here
const createViolation = async (req, res) => {
  try {
    const data = {
      ...req.body,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date()
    };
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
    const [total, critical, high, medium, low, open, totalEvents, openViolations] = await Promise.all([
      Violation.countDocuments(),
      Violation.countDocuments({ severity: 'CRITICAL' }),
      Violation.countDocuments({ severity: 'HIGH' }),
      Violation.countDocuments({ severity: 'MEDIUM' }),
      Violation.countDocuments({ severity: 'LOW' }),
      Violation.countDocuments({ status: 'OPEN' }),
      Event.countDocuments(),
      Violation.find({ status: 'OPEN' }),
    ]);

    // DPDPA 5-Pillar Statutory Compliance Scoring
    let complianceScore = 100;
    if (openViolations.length > 0) {
      const hasCriticalLog = openViolations.some(v => v.source === 'APPLICATION_LOG' && v.severity === 'CRITICAL');
      const hasHighLog     = openViolations.some(v => v.source === 'APPLICATION_LOG' && v.severity === 'HIGH');
      const purposeCount   = openViolations.filter(v => v.type === 'PURPOSE_MISMATCH').length;
      const retentionCount = openViolations.filter(v => v.type === 'RETENTION_VIOLATION').length;
      const consentBreach  = openViolations.some(v => v.title?.toLowerCase().includes('consent'));

      let deductions = 0;
      if (hasCriticalLog) deductions += 20;
      else if (hasHighLog) deductions += 10;

      if (purposeCount > 0) deductions += Math.min(20, purposeCount * 5);
      if (consentBreach) deductions += 15;
      if (retentionCount > 0) deductions += 10;

      complianceScore = Math.max(0, 100 - deductions);
    }

    res.json({
      success: true,
      data: { total, critical, high, medium, low, open, totalEvents, complianceScore },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/violations/reset/all — clears all data for a fresh real-time run
const resetAllData = async (req, res) => {
  try {
    await Promise.all([
      Violation.deleteMany({}),
      Event.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    const io = req.app.get('io');
    if (io) {
      io.emit('DATA_RESET', { timestamp: new Date().toISOString() });
    }

    res.json({ success: true, message: 'PrivGuard database cleared successfully. Ready for fresh real-time DemoApp telemetry.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createViolation, getViolations, getViolationById, getStats, resetAllData };

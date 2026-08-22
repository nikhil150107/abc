const Violation = require('../models/Violation');
const Event     = require('../models/Event');
const AuditLog  = require('../models/AuditLog');

// ── PII masking ───────────────────────────────────────────────
const maskEmail = (v) => {
  if (!v || !v.includes('@')) return v;
  const [user, domain] = v.split('@');
  return `${user[0]}***@${domain}`;
};

const maskPhone = (v) => {
  if (!v) return v;
  const s = String(v).replace(/\D/g, '');
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
};

const maskPAN = (v) => {
  if (!v) return v;
  return `${v.slice(0, 2)}${'*'.repeat(v.length - 4)}${v.slice(-2)}`;
};

const maskAadhaar = (v) => {
  if (!v) return v;
  return `****-****-${String(v).replace(/\D/g, '').slice(-4)}`;
};

const maskGeneric = (v) => {
  if (!v) return v;
  const s = String(v);
  return `${s[0]}${'*'.repeat(Math.max(1, s.length - 2))}${s.slice(-1)}`;
};

// Build masked evidence object from raw payload
const buildEvidence = (detectedPII = [], rawPayload = {}) => {
  const evidence = {};
  const src = typeof rawPayload === 'string' ? {} : rawPayload;

  detectedPII.forEach(piiType => {
    switch (piiType.toUpperCase()) {
      case 'EMAIL':
        if (src.email)   evidence.email   = maskEmail(src.email);
        else             evidence.email   = 'u***@***.com';
        break;
      case 'PHONE':
        if (src.phone)   evidence.phone   = maskPhone(src.phone);
        else             evidence.phone   = '******0000';
        break;
      case 'PAN':
        if (src.pan)     evidence.pan     = maskPAN(src.pan);
        else             evidence.pan     = 'AB***1234F';
        break;
      case 'AADHAAR':
        if (src.aadhaar) evidence.aadhaar = maskAadhaar(src.aadhaar);
        else             evidence.aadhaar = '****-****-9012';
        break;
      default:
        evidence[piiType.toLowerCase()] = maskGeneric(src[piiType.toLowerCase()] || piiType);
    }
  });

  return evidence;
};

// POST /api/violations — Member 3 sends violation here
const createViolation = async (req, res) => {
  try {
    const body = req.body;

    // Build masked evidence — never store raw PII values
    const rawPayload = body.rawPayload || body.payload || {};
    const evidence   = body.evidence || buildEvidence(body.detectedPII || body.detectedData || [], rawPayload);

    const data = {
      ...body,
      evidence,
      rawPayload:  undefined,  // strip raw payload before storing
      timestamp:   body.timestamp ? new Date(body.timestamp) : new Date(),
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

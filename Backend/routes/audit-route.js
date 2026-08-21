const express = require('express');
const router = express.Router();
const { scanTargetApp, exportAuditReport } = require('../controllers/audit-controller');

// Autonomous Scan & Evaluation
router.post('/scan-target', scanTargetApp);

// Export Report
router.get('/report', exportAuditReport);

module.exports = router;

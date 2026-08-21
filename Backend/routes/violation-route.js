const express = require('express');
const router = express.Router();
const { createViolation, getViolations, getViolationById, getStats, resetAllData } = require('../controllers/violation-controller');

router.get('/stats/summary', getStats);
router.delete('/reset/all', resetAllData);
router.post('/', createViolation);
router.get('/', getViolations);
router.get('/:id', getViolationById);

module.exports = router;

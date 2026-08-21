const express = require('express');
const router = express.Router();
const { getPolicies, getPolicyById } = require('../controllers/policy-controller');

router.get('/', getPolicies);
router.get('/:id', getPolicyById);

module.exports = router;

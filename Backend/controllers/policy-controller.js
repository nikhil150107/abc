const Policy = require('../models/Policy');

const getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({ enabled: true });
    res.json({ success: true, data: policies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPolicyById = async (req, res) => {
  try {
    const policy = await Policy.findOne({ policyId: req.params.id });
    if (!policy) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPolicies, getPolicyById };

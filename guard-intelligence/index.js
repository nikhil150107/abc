/**
 * @file index.js
 * @description Main module entry point for Member 3: Policy Engine, Violation Engine, Risk Engine & AI Explanation.
 */

require("dotenv").config();

const { processEvent } = require("./services/compliance.service");
const { getActivePolicies, getPolicyById } = require("./services/policy.service");
const { calculateRisk } = require("./services/risk.service");
const { enrichWithAI } = require("./services/ai.service");
const { createViolationObject, saveViolation, formatViolationOutput } = require("./services/violation.service");
const { fetchPoliciesFromAPI, fetchPolicyByIdFromAPI, sendViolationToAPI } = require("./services/api.client");
const { seedDefaultPolicies } = require("./seed/policySeed");
const Policy = require("./models/Policy");
const Violation = require("./models/Violation");

module.exports = {
  // Primary entry point function
  processEvent,

  // Modular services
  policyService: { getActivePolicies, getPolicyById },
  riskService: { calculateRisk },
  aiService: { enrichWithAI },
  violationService: { createViolationObject, saveViolation, formatViolationOutput },
  apiClient: { fetchPoliciesFromAPI, fetchPolicyByIdFromAPI, sendViolationToAPI },

  // Seed utility
  seedDefaultPolicies,

  // Mongoose Models
  Policy,
  Violation,
};

/**
 * @file policy.service.js
 * @description Service layer for managing and retrieving policies from MongoDB or REST API endpoint (GET /api/policies).
 */

const mongoose = require("mongoose");
const Policy = require("../models/Policy");
const { fetchPoliciesFromAPI, fetchPolicyByIdFromAPI } = require("./api.client");

/**
 * Fetches all enabled compliance policies for a specific organization.
 * Queries MongoDB directly if connected; falls back to GET /api/policies REST API.
 * 
 * @param {string|mongoose.Types.ObjectId} organizationId - The organization ID.
 * @returns {Promise<Array<Object>>} Array of active Policy documents.
 */
async function getActivePolicies(organizationId) {
  if (!organizationId) {
    throw new Error("organizationId is required to fetch active policies");
  }

  // 1. Direct MongoDB Query
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const policies = await Policy.find({
      organizationId,
      enabled: true,
    }).lean();

    if (policies && policies.length > 0) {
      return policies;
    }
  }

  // 2. HTTP REST API Fallback (GET /api/policies)
  const apiPolicies = await fetchPoliciesFromAPI(organizationId);
  return apiPolicies.filter((p) => p.enabled !== false);
}

/**
 * Fetches a single policy by ID (supports GET /api/policies/:id).
 *
 * @param {string} policyId - Policy ID.
 * @returns {Promise<Object|null>} Policy document or null.
 */
async function getPolicyById(policyId) {
  if (!policyId) return null;

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const policy = await Policy.findById(policyId).lean();
    if (policy) return policy;
  }

  return await fetchPolicyByIdFromAPI(policyId);
}

module.exports = {
  getActivePolicies,
  getPolicyById,
};

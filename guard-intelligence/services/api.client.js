/**
 * @file api.client.js
 * @description HTTP Client for Member 3 to communicate with team REST API endpoints.
 * Endpoints:
 * - GET  /api/policies       (Member 3 fetches policies)
 * - GET  /api/policies/:id   (Member 3 fetches single policy)
 * - POST /api/violations     (Member 3 sends violations)
 */

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "http://localhost:5000";

/**
 * Fetches active policies for an organization from the REST API endpoint (GET /api/policies).
 *
 * @param {string} organizationId - Target organization ID.
 * @param {string} [baseUrl=BACKEND_BASE_URL] - Base backend URL.
 * @returns {Promise<Array<Object>>} Array of Policy objects.
 */
async function fetchPoliciesFromAPI(organizationId, baseUrl = BACKEND_BASE_URL) {
  try {
    const url = new URL("/api/policies", baseUrl);
    if (organizationId) {
      url.searchParams.append("organizationId", organizationId);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`GET /api/policies returned status ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.policies || [];
  } catch (error) {
    console.warn("[api.client] Failed to fetch policies via GET /api/policies:", error.message);
    return [];
  }
}

/**
 * Fetches a single policy by ID from the REST API endpoint (GET /api/policies/:id).
 *
 * @param {string} policyId - Policy ID.
 * @param {string} [baseUrl=BACKEND_BASE_URL] - Base backend URL.
 * @returns {Promise<Object|null>} Policy object or null.
 */
async function fetchPolicyByIdFromAPI(policyId, baseUrl = BACKEND_BASE_URL) {
  try {
    const response = await fetch(`${baseUrl}/api/policies/${policyId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`GET /api/policies/${policyId} returned status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[api.client] Failed to fetch policy GET /api/policies/${policyId}:`, error.message);
    return null;
  }
}

/**
 * Sends a detected violation payload to the REST API endpoint (POST /api/violations).
 *
 * @param {Object} violationPayload - Standardized violation object.
 * @param {string} [baseUrl=BACKEND_BASE_URL] - Base backend URL.
 * @returns {Promise<Object>} Response from POST /api/violations.
 */
async function sendViolationToAPI(violationPayload, baseUrl = BACKEND_BASE_URL) {
  try {
    const response = await fetch(`${baseUrl}/api/violations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(violationPayload),
    });

    if (!response.ok) {
      throw new Error(`POST /api/violations returned status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn("[api.client] Failed to send violation via POST /api/violations:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  fetchPoliciesFromAPI,
  fetchPolicyByIdFromAPI,
  sendViolationToAPI,
};

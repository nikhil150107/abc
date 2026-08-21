/**
 * @file policySeed.js
 * @description Seed utility to initialize 3 default policies for testing DPDPA compliance monitoring.
 */

const Policy = require("../models/Policy");

/**
 * Seeds 3 default policies for a given organizationId.
 * 
 * @param {string|mongoose.Types.ObjectId} organizationId - Target organization ID (defaults to "ORG-001").
 * @returns {Promise<Array<Object>>} Array of created or existing policy documents.
 */
async function seedDefaultPolicies(organizationId = "ORG-001") {
  const defaultPolicies = [
    {
      organizationId,
      name: "Strict No Raw PII Logging Policy",
      type: "PII_EXPOSURE",
      severity: "HIGH",
      enabled: true,
      config: {
        piiType: "EMAIL",
        loggingAllowed: false,
      },
    },
    {
      organizationId,
      name: "Payment & KYC Purpose Policy",
      type: "PURPOSE_MISMATCH",
      severity: "MEDIUM",
      enabled: true,
      config: {
        allowedPurposes: ["PAYMENT_PROCESSING", "KYC_VERIFICATION"],
      },
    },
    {
      organizationId,
      name: "90-Day Statutory Data Retention Policy",
      type: "RETENTION_VIOLATION",
      severity: "CRITICAL",
      enabled: true,
      config: {
        retentionDays: 90,
      },
    },
  ];

  const seededPolicies = [];
  for (const policyData of defaultPolicies) {
    const existing = await Policy.findOne({
      organizationId: policyData.organizationId,
      type: policyData.type,
      name: policyData.name,
    });

    if (existing) {
      seededPolicies.push(existing);
    } else {
      const newPolicy = await Policy.create(policyData);
      seededPolicies.push(newPolicy);
    }
  }

  return seededPolicies;
}

module.exports = {
  seedDefaultPolicies,
};

/**
 * @file violation.service.js
 * @description Service for instantiating, saving, and formatting compliance violations.
 */

const mongoose = require("mongoose");
const Violation = require("../models/Violation");
const { sendViolationToAPI } = require("./api.client");

/**
 * Generates a unique violation ID formatted as VIO-YYYYMMDD-XXX
 */
function generateViolationId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit number
  return `VIO-${dateStr}-${randomSuffix}`;
}

/**
 * Infers the precise database table, origin subsystem, and component for any violation.
 */
function inferBreachLocation(event = {}, piiList = [], policy = {}) {
  const endpoint = event.endpoint || '/api';
  const source = event.source || 'APPLICATION_API';
  const service = event.service || 'demoapp-core';
  const rule = String(policy.rule || policy.type || '').toUpperCase();

  let table = 'data_processing_events';
  let originType = 'API_ENDPOINT';
  let component = `${service} Backend`;
  let handler = 'Express Route Handler';
  let columns = piiList.length > 0 ? piiList : ['personal_data'];

  const ep = endpoint.toLowerCase();
  if (ep.includes('order') || ep.includes('checkout') || ep.includes('cart')) {
    table = 'orders, order_items';
    originType = 'DATABASE_TABLE';
    component = 'Order Processing Engine & MySQL Orders Table';
    handler = 'productOrderController.js:createOrder';
    columns = ['shippingAddress', 'shippingCity', 'mobileNumber', ...piiList];
  } else if (ep.includes('user') || ep.includes('profile') || ep.includes('register') || ep.includes('auth') || ep.includes('login')) {
    table = 'users';
    originType = source === 'APPLICATION_LOG' ? 'APPLICATION_LOG' : 'DATABASE_TABLE';
    component = 'User Identity & Authentication Module (MySQL: users)';
    handler = 'userController.js';
    columns = ['fullName', 'email', 'mobileNumber', 'dateOfBirth', 'address', ...piiList];
  } else if (ep.includes('consent')) {
    table = 'consents, consent_history';
    originType = 'CONSENT_STORE';
    component = 'Consent Lifecycle Management Service (MySQL: consents)';
    handler = 'consentController.js';
    columns = ['purpose', 'status', 'withdrawnAt', ...piiList];
  } else if (source === 'APPLICATION_LOG' || ep.includes('log')) {
    table = 'application_audit_logs';
    originType = 'APPLICATION_LOG';
    component = 'Application Server Log Engine (MySQL: application_audit_logs)';
    handler = 'logger.js';
    columns = ['message', 'rawLogData', ...piiList];
  } else if (rule.includes('RETENTION') || ep.includes('retention')) {
    table = 'data_processing_events';
    originType = 'DATABASE_TABLE';
    component = 'Historical Data Storage Engine (MySQL: data_processing_events)';
    handler = 'MySQL Database Storage';
    columns = ['createdAt', 'dataFields', 'purpose'];
  }

  return {
    originType,
    table,
    columns: [...new Set(columns)],
    endpoint,
    component,
    handler,
    codeReference: `${service} -> ${handler} (Target Table: \`${table}\`)`
  };
}

/**
 * Constructs a standardized violation object prior to persistence and AI enrichment.
 */
function createViolationObject({ event, policy, riskScore, detectedData, title, reason, aiResult = {} }) {
  const piiList = detectedData || event.detectedPII || [];
  const breachLocation = event.breachLocation || inferBreachLocation(event, piiList, policy);

  return {
    violationId: generateViolationId(),
    organizationId: event.organizationId || "ORG-001",
    applicationId: event.applicationId || null,
    eventId: event.eventId,
    policyId: policy._id || policy.policyId || "POL-001",
    type: policy.type || policy.rule || "PII_EXPOSURE",
    severity: policy.severity || "HIGH",
    riskScore: riskScore,
    service: event.service || policy.config?.service || "unknown-service",
    source: event.source || "APPLICATION_LOG",
    endpoint: event.endpoint || null,
    detectedData: piiList,
    detectedPII: piiList,
    breachLocation,
    title: title,
    reason: reason,
    aiExplanation: aiResult.explanation || "",
    explanation: aiResult.explanation || "",
    recommendation: aiResult.recommendation || "",
    status: "OPEN",
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    policy: {
      policyId: String(policy._id || policy.policyId || "POL-001"),
      rule: String(policy.rule || policy.type || "PII_EXPOSURE"),
    },
  };
}

/**
 * Formats a Mongoose Violation document or JS object to match the exact Output Contract for Member 4
 * and PriviGuard Backend/Frontend schema expectations seamlessly.
 *
 * @param {Object} doc - Violation object or document.
 * @returns {Object} Clean JSON object with dual alias fields.
 */
function formatViolationOutput(doc) {
  const raw = doc && typeof doc.toObject === "function" ? doc.toObject() : doc;
  const piiList = raw.detectedData || raw.detectedPII || [];
  const expText = raw.aiExplanation || raw.explanation || "";

  return {
    violationId: String(raw.violationId),
    organizationId: String(raw.organizationId || "ORG-001"),
    applicationId: raw.applicationId ? String(raw.applicationId) : null,
    eventId: String(raw.eventId),
    policyId: String(raw.policyId || raw.policy?.policyId || "POL-001"),
    type: raw.type || raw.policy?.rule || "PII_EXPOSURE",
    severity: raw.severity || "HIGH",
    riskScore: raw.riskScore,
    service: raw.service || "unknown-service",
    source: raw.source || "APPLICATION_LOG",
    endpoint: raw.endpoint || null,
    detectedData: piiList,
    detectedPII: piiList,
    breachLocation: raw.breachLocation || inferBreachLocation(raw, piiList, raw.policy || {}),
    title: raw.title || "Compliance Policy Violation",
    reason: raw.reason || "DPDPA compliance policy condition triggered",
    aiExplanation: expText,
    explanation: expText,
    recommendation: raw.recommendation || "",
    status: raw.status || "OPEN",
    timestamp: raw.timestamp instanceof Date ? raw.timestamp.toISOString() : new Date(raw.timestamp || Date.now()).toISOString(),
    policy: {
      policyId: String(raw.policyId || raw.policy?.policyId || "POL-001"),
      rule: String(raw.type || raw.policy?.rule || "PII_EXPOSURE"),
    },
  };
}

/**
 * Saves a violation document to MongoDB when connected and optionally posts to POST /api/violations.
 *
 * @param {Object} violationData - The violation attributes to persist.
 * @param {boolean} [postToApi=false] - Whether to send HTTP POST /api/violations to team server.
 * @returns {Promise<Object>} Formatted violation object matching output contract.
 */
async function saveViolation(violationData, postToApi = false) {
  const formatted = formatViolationOutput(violationData);

  // 1. Direct MongoDB Persistence
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const violationDoc = new Violation(violationData);
      await violationDoc.save();
    } catch (error) {
      console.warn("[violation.service] Database persistence warning:", error.message);
    }
  }

  // 2. HTTP POST /api/violations Trigger (if enabled)
  if (postToApi || process.env.POST_VIOLATIONS_TO_API === "true") {
    await sendViolationToAPI(formatted);
  }

  return formatted;
}

module.exports = {
  createViolationObject,
  saveViolation,
  formatViolationOutput,
  generateViolationId,
  sendViolationToAPI,
};

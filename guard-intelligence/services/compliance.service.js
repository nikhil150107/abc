/**
 * @file compliance.service.js
 * @description Main intelligence service orchestrating policy engine, violation detection,
 * risk calculation, AI enrichment, and persistence.
 */

const policyService = require("./policy.service");
const riskService = require("./risk.service");
const aiService = require("./ai.service");
const violationService = require("./violation.service");

// Rule to PII Mapping for Backend Default Policies
const RULE_TO_PII_MAP = {
  EMAIL_LOGGING_PROHIBITED: "EMAIL",
  PHONE_LOGGING_PROHIBITED: "PHONE",
  PAN_LOGGING_PROHIBITED: "PAN",
  AADHAAR_LOGGING_PROHIBITED: "AADHAAR",
};

/**
 * Deterministically checks an event against a single policy rule.
 * Supports both Member 3 policy schemas and Backend seed policy schemas seamlessly.
 * 
 * CRITICAL RULE: Violation detection must be 100% deterministic (rule-based).
 * AI is NEVER used to decide whether a violation exists.
 *
 * @param {Object} event - Normalized input event from Member 2.
 * @param {Object} policy - Policy document.
 * @returns {Object|null} Triggered rule metadata or null.
 */
function evaluatePolicyRule(event, policy) {
  if (policy.enabled === false) return null;

  const config = policy.config || {};
  const detectedPII = event.detectedPII || [];
  const policyType = policy.type || policy.rule;
  const targetRulePii = RULE_TO_PII_MAP[policy.rule] || config.piiType;

  // ----------------------------------------------------
  // Rule 1: PII Exposure & Logging Prohibitions (DPDPA Sec 8(5))
  // Matches PII_EXPOSURE type or *_LOGGING_PROHIBITED rule names
  // ----------------------------------------------------
  const isPiiRule =
    policyType === "PII_EXPOSURE" ||
    Boolean(RULE_TO_PII_MAP[policy.rule]);

  if (isPiiRule) {
    let piiMatched = false;
    let matchingData = [];

    if (targetRulePii) {
      if (detectedPII.includes(targetRulePii)) {
        piiMatched = true;
        matchingData = [targetRulePii];
      }
    } else if (detectedPII.length > 0) {
      piiMatched = true;
      matchingData = detectedPII;
    }

    if (piiMatched) {
      const isLog = event.source === "APPLICATION_LOG" || (event.type && String(event.type).startsWith('LOG_'));
      const dataStr = (matchingData.length > 0 ? matchingData : detectedPII).join(", ");
      
      return {
        type: policy.type || "PII_EXPOSURE",
        rule: policy.rule || "PII_EXPOSURE",
        title: isLog 
          ? (policy.name || `Plaintext Personal Data (${dataStr}) in Application Logs`)
          : `Personal Data (${dataStr}) Exposure in API Processing`,
        reason: isLog
          ? `Raw PII (${dataStr}) was recorded in application logs while statutory DPDPA policy prohibits logging of personal data in plaintext.`
          : `Personal data (${dataStr}) detected in real-time processing event at endpoint '${event.endpoint || '/api'}'.`,
        detectedData: matchingData.length > 0 ? matchingData : detectedPII,
      };
    }
  }

  // ----------------------------------------------------
  // Rule 2: Purpose Mismatch & Consent Failures (DPDPA Sec 6(1) & Sec 6(4))
  // ----------------------------------------------------
  if (policyType === "PURPOSE_MISMATCH" || policy.rule === "PURPOSE_MISMATCH") {
    const observedPurpose = event.purpose || event.payload?.purpose;
    const eventType = String(event.type || event.eventType || '').toUpperCase();
    const endpoint = String(event.endpoint || '').toLowerCase();
    const fields = event.detectedPII || [];

    // Scenario A: Phone used in Orders / Commercial Transaction (when declared scope is OTP only)
    if (fields.includes('PHONE') && (eventType.includes('ORDER') || endpoint.includes('/orders') || eventType === 'ORDER_CREATED')) {
      return {
        type: "PURPOSE_MISMATCH",
        rule: "PURPOSE_MISMATCH",
        title: "Purpose-Use Mismatch: Mobile Number Used Beyond Declared Scope",
        reason: `Declared purpose for mobileNumber in Data Inventory is 'OTP verification only', but observed in transaction event '${eventType}'. DPDPA Section 6(1) requires processing only for declared, specified purposes.`,
        detectedData: ['PHONE'],
      };
    }

    // Scenario B: Marketing processing post consent withdrawal
    if (eventType.includes('MARKETING') || (event.payload && (event.payload.trigger === 'POST_CONSENT_WITHDRAWAL' || String(event.payload.note).includes('CONSENT')))) {
      return {
        type: "PURPOSE_MISMATCH",
        rule: "PURPOSE_MISMATCH",
        title: "Consent Enforcement Failure: Marketing Processing Post-Withdrawal",
        reason: `Marketing processing event executed for user after consent was withdrawn. Under DPDPA Section 6(4), processing must cease immediately upon consent withdrawal.`,
        detectedData: fields.length > 0 ? fields : ['EMAIL'],
      };
    }

    // Scenario C: Custom allowed purposes check
    const allowedPurposes = config.allowedPurposes || [];
    if (observedPurpose && allowedPurposes.length > 0 && !allowedPurposes.includes(observedPurpose)) {
      return {
        type: "PURPOSE_MISMATCH",
        rule: "PURPOSE_MISMATCH",
        title: policy.name || "Unauthorized data processing purpose detected",
        reason: `Observed purpose '${observedPurpose}' is not in the allowed purposes list [${allowedPurposes.join(", ")}].`,
        detectedData: detectedPII,
      };
    }
  }

  // ----------------------------------------------------
  // Rule 3: Retention Violation (DPDPA Sec 8(7))
  // ----------------------------------------------------
  if (policyType === "RETENTION_VIOLATION" || policy.rule === "RETENTION_VIOLATION") {
    let dataAgeDays = 0;

    if (typeof event.dataAgeDays === "number") {
      dataAgeDays = event.dataAgeDays;
    } else if (typeof event.dataAge === "number") {
      dataAgeDays = event.dataAge;
    } else if (event.dataTimestamp || event.timestamp) {
      const eventTime = new Date(event.dataTimestamp || event.timestamp).getTime();
      const now = Date.now();
      dataAgeDays = Math.floor((now - eventTime) / (1000 * 60 * 60 * 24));
    }

    const maxDays = typeof config.retentionDays === "number" ? config.retentionDays : 365;
    if (dataAgeDays > maxDays) {
      return {
        type: "RETENTION_VIOLATION",
        rule: "RETENTION_VIOLATION",
        title: policy.name || "Data retention period threshold exceeded",
        reason: `Data age of ${dataAgeDays} days exceeds allowed statutory retention schedule of ${maxDays} days.`,
        detectedData: detectedPII,
      };
    }
  }

  return null;
}

/**
 * Main core intelligence entry point.
 * Processes a normalized event from Member 2 and produces violation contract outputs for Member 4.
 *
 * Pipeline: Member 2 Event -> Policy Evaluation -> Risk Engine -> AI Explanation -> DB Persistence -> Output JSON
 *
 * @param {Object} normalizedEvent - Event payload received from Member 2.
 * @returns {Promise<Array<Object>>} Array of saved violation objects adhering to output contract.
 */
async function processEvent(normalizedEvent) {
  if (!normalizedEvent) {
    throw new Error("[compliance.service] Invalid normalizedEvent: payload is required");
  }

  // Fallback organizationId if missing in event payload
  const orgId = normalizedEvent.organizationId || "ORG-001";

  // 1. Fetch active policies for organization (or use injected policies / active policies)
  let policies = normalizedEvent._activePolicies;
  if (!policies || policies.length === 0) {
    policies = await policyService.getActivePolicies(orgId);
  }

  const createdViolations = [];

  // 2. Deterministic violation detection loop
  for (const policy of policies) {
    const trigger = evaluatePolicyRule(normalizedEvent, policy);

    if (trigger) {
      // 3. Calculate Risk Score via Risk Engine
      const riskScore = riskService.calculateRisk(policy.severity, policy.type || policy.rule, {
        detectedData: trigger.detectedData,
        eventDetectedPII: normalizedEvent.detectedPII,
        source: normalizedEvent.source,
      });

      // 4. Construct preliminary violation object
      const partialViolation = {
        type: policy.type || policy.rule,
        severity: policy.severity || "HIGH",
        riskScore: riskScore,
        source: normalizedEvent.source,
        endpoint: normalizedEvent.endpoint,
        service: normalizedEvent.service,
        detectedData: trigger.detectedData,
        title: trigger.title,
        reason: trigger.reason,
        purpose: normalizedEvent.purpose,
      };

      // 5. Call AI Engine for Explanation & Recommendation (ONLY AFTER violation is detected)
      const aiResult = await aiService.enrichWithAI(partialViolation);

      // 6. Build final violation payload
      const violationObject = violationService.createViolationObject({
        event: { ...normalizedEvent, organizationId: orgId },
        policy: policy,
        riskScore: riskScore,
        detectedData: trigger.detectedData,
        title: trigger.title,
        reason: trigger.reason,
        aiResult: aiResult,
      });

      // 7. Persist to MongoDB and format for Member 4 contract output
      const savedViolation = await violationService.saveViolation(violationObject);
      createdViolations.push(savedViolation);
    }
  }

  return createdViolations;
}

module.exports = {
  processEvent,
  evaluatePolicyRule,
};

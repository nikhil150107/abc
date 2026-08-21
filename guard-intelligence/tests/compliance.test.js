/**
 * @file compliance.test.js
 * @description Comprehensive automated unit and integration tests for Member 3's DPDPA module.
 */

const assert = require("assert");
const { processEvent } = require("../services/compliance.service");
const { calculateRisk } = require("../services/risk.service");
const { enrichWithAI, getFallbackAI } = require("../services/ai.service");
const { evaluatePolicyRule } = require("../services/compliance.service");

async function runTests() {
  console.log("=================================================");
  console.log(" RUNNING MEMBER 3 DPDPA COMPLIANCE MODULE TESTS ");
  console.log("=================================================\n");

  let testCount = 0;
  let passCount = 0;

  function test(name, fn) {
    testCount++;
    try {
      fn();
      passCount++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(err);
    }
  }

  async function testAsync(name, fn) {
    testCount++;
    try {
      await fn();
      passCount++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(err);
    }
  }

  // --- Mock Policies ---
  const policyPII = {
    _id: "POL-001",
    organizationId: "ORG-001",
    name: "No Raw PII Logging",
    type: "PII_EXPOSURE",
    severity: "HIGH",
    enabled: true,
    config: { piiType: "EMAIL", loggingAllowed: false },
  };

  const policyPurpose = {
    _id: "POL-002",
    organizationId: "ORG-001",
    name: "Allowed Purposes Policy",
    type: "PURPOSE_MISMATCH",
    severity: "MEDIUM",
    enabled: true,
    config: { allowedPurposes: ["PAYMENT_PROCESSING", "KYC_VERIFICATION"] },
  };

  const policyRetention = {
    _id: "POL-003",
    organizationId: "ORG-001",
    name: "90 Days Retention Policy",
    type: "RETENTION_VIOLATION",
    severity: "CRITICAL",
    enabled: true,
    config: { retentionDays: 90 },
  };

  // 1. Risk Engine Tests
  test("Risk Engine: Base Scores & Boosters", () => {
    const lowRisk = calculateRisk("LOW", "PII_EXPOSURE", {});
    assert.strictEqual(lowRisk, 25, "LOW severity should be 25");

    const highRiskLog = calculateRisk("HIGH", "PII_EXPOSURE", {
      detectedData: ["EMAIL", "PHONE"],
      source: "APPLICATION_LOG",
    });
    // Base HIGH=75 + 5 (multiple PII) + 5 (log source PII_EXPOSURE) = 85
    assert.strictEqual(highRiskLog, 85, "HIGH + log booster should equal 85");

    const cappedRisk = calculateRisk("CRITICAL", "PII_EXPOSURE", {
      detectedData: ["AADHAAR", "PAN"],
      source: "APPLICATION_LOG",
    });
    // 95 + boosters capped at 100
    assert.strictEqual(cappedRisk, 100, "Risk score must cap at 100");
  });

  // 2. Deterministic Rule 1: PII Exposure
  test("Policy Engine: Rule 1 - PII Exposure Detection", () => {
    const event = {
      source: "APPLICATION_LOG",
      detectedPII: ["EMAIL", "PHONE"],
    };

    const trigger = evaluatePolicyRule(event, policyPII);
    assert.notStrictEqual(trigger, null, "PII Exposure should be detected");
    assert.strictEqual(trigger.type, "PII_EXPOSURE");
    assert.deepStrictEqual(trigger.detectedData, ["EMAIL"]);
  });

  // 3. Deterministic Rule 2: Purpose Mismatch
  test("Policy Engine: Rule 2 - Purpose Mismatch Detection", () => {
    const validEvent = {
      source: "API",
      purpose: "PAYMENT_PROCESSING",
    };
    const invalidEvent = {
      source: "API",
      purpose: "UNAUTHORIZED_ADVERTISING",
    };

    const triggerValid = evaluatePolicyRule(validEvent, policyPurpose);
    assert.strictEqual(triggerValid, null, "Allowed purpose should not trigger violation");

    const triggerInvalid = evaluatePolicyRule(invalidEvent, policyPurpose);
    assert.notStrictEqual(triggerInvalid, null, "Disallowed purpose must trigger violation");
    assert.strictEqual(triggerInvalid.type, "PURPOSE_MISMATCH");
  });

  // 4. Deterministic Rule 3: Retention Violation
  test("Policy Engine: Rule 3 - Retention Exceeded Detection", () => {
    const freshEvent = { dataAgeDays: 30 };
    const expiredEvent = { dataAgeDays: 120 };

    assert.strictEqual(evaluatePolicyRule(freshEvent, policyRetention), null);

    const trigger = evaluatePolicyRule(expiredEvent, policyRetention);
    assert.notStrictEqual(trigger, null);
    assert.strictEqual(trigger.type, "RETENTION_VIOLATION");
  });

  // 5. AI Service Fallback & Enrichment Test
  test("AI Service: Post-Detection Fallback Explanation & Recommendation", () => {
    const fallback = getFallbackAI({ type: "PII_EXPOSURE", detectedData: ["EMAIL", "PHONE"] });
    assert.ok(fallback.explanation.length > 0, "Explanation should not be empty");
    assert.ok(fallback.recommendation.length > 0, "Recommendation should not be empty");
  });

  // 6. End-to-End processEvent Pipeline & Output Contract
  await testAsync("Full processEvent Pipeline & Output Contract Verification", async () => {
    const normalizedInputEvent = {
      eventId: "EVT-001",
      organizationId: "ORG-001",
      applicationId: "APP-001",
      source: "APPLICATION_LOG",
      eventType: "USER_PAYMENT_LOG",
      endpoint: "/api/payment",
      purpose: "PAYMENT_PROCESSING",
      service: "payment-service",
      detectedPII: ["PHONE", "EMAIL"],
      data: { email: "customer@example.com" },
      timestamp: "2026-08-21T14:55:00.000Z",
      _activePolicies: [policyPII],
    };

    const violations = await processEvent(normalizedInputEvent);

    assert.strictEqual(violations.length, 1, "Should produce exactly 1 violation");
    const vio = violations[0];

    // Check exact fields from Output Contract
    assert.strictEqual(vio.organizationId, "ORG-001");
    assert.strictEqual(vio.applicationId, "APP-001");
    assert.strictEqual(vio.eventId, "EVT-001");
    assert.strictEqual(vio.policyId, "POL-001");
    assert.strictEqual(vio.type, "PII_EXPOSURE");
    assert.strictEqual(vio.severity, "HIGH");
    assert.strictEqual(vio.riskScore, 85);
    assert.strictEqual(vio.service, "payment-service");
    assert.strictEqual(vio.source, "APPLICATION_LOG");
    assert.strictEqual(vio.endpoint, "/api/payment");
    assert.deepStrictEqual(vio.detectedData, ["EMAIL"]);
    assert.strictEqual(vio.status, "OPEN");
    assert.ok(vio.violationId.startsWith("VIO-"), "violationId format valid");
    assert.ok(vio.title.length > 0, "title present");
    assert.ok(vio.reason.length > 0, "reason present");
    assert.ok(vio.aiExplanation.length > 0, "aiExplanation present");
    assert.ok(vio.recommendation.length > 0, "recommendation present");
    assert.ok(vio.timestamp, "timestamp present");

    console.log("\nSample Output Contract JSON:");
    console.log(JSON.stringify(vio, null, 2));
  });

  console.log(`\n=================================================`);
  console.log(` SUMMARY: Passed ${passCount} / ${testCount} tests.`);
  console.log(`=================================================\n`);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});

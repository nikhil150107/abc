/**
 * @file ai.service.js
 * @description Service for generating DPDPA violation explanations
 * and recommendations using LLMs.
 *
 * NOTE:
 * AI is invoked ONLY AFTER a violation has already been
 * deterministically detected by the policy/rule engine.
 */

const { GoogleGenAI } = require("@google/genai");
const OpenAI = require("openai");

/**
 * Deterministic fallback explanations when:
 * - No LLM API key is available
 * - LLM request fails
 * - LLM response cannot be parsed
 *
 * This guarantees that the dashboard always receives
 * explanation + recommendation.
 */
function getFallbackAI(violation) {
  const type = violation.type;

  // Support both possible field names.
  const detectedPII =
    violation.detectedPII ||
    violation.detectedData ||
    [];

  const detected =
    Array.isArray(detectedPII) && detectedPII.length > 0
      ? detectedPII.join(", ")
      : "PII";

  switch (type) {

    case "PII_EXPOSURE":
      return {
        explanation:
          `Plaintext personal identifiers (${detected}) were detected in application log streams. Logging raw personal data violates data minimization principles and increases exposure risk under DPDPA Section 8(5).`,

        recommendation:
          "Deploy Winston or Bunyan log-sanitization middleware to intercept and redact raw personal identifiers before write operations. Replace sensitive log fields with pseudonymized tokens (e.g., UUID hashes) to preserve debug utility safely.",
      };

    case "PURPOSE_MISMATCH":
      return {
        explanation:
          `Personal data (${detected}) was processed for an operation that deviates from the user's declared consent scope. Processing data outside specified notice constraints is a direct violation of DPDPA Section 6(1).`,

        recommendation:
          "Integrate a consent enforcement layer within the API middleware to verify active user preference flags prior to downstream processing. To use data for new purposes, update the itemized privacy notice and obtain explicit consent.",
      };

    case "RETENTION_VIOLATION":
      return {
        explanation:
          "Personal data records have been retained in active system storage beyond the maximum authorized storage duration, violating the purpose-bound retention limitation under DPDPA Section 8(7).",

        recommendation:
          "Establish an automated data deletion cron job or set up a native database Time-To-Live (TTL) index to permanently purge or irreversibly anonymize user records immediately upon retention schedule expiry.",
      };

    default:
      return {
        explanation:
          "An unauthorized data processing activity was detected that conflicts with DPDPA statutory compliance policies and notice frameworks.",

        recommendation:
          "Conduct a formal data flow audit, enforce role-based access control (RBAC), and apply tokenization or masking to personal data attributes to ensure alignment with statutory obligations.",
      };
  }
}

/**
 * Enriches an already-detected violation with:
 * - AI explanation
 * - AI recommendation
 *
 * IMPORTANT:
 * AI DOES NOT decide whether a violation exists.
 * The deterministic policy engine has already made that decision.
 *
 * @param {Object} violationContext
 * @returns {Promise<{
 *   explanation: string,
 *   recommendation: string
 * }>}
 */
async function enrichWithAI(violationContext) {

  const geminiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  const openAIKey = process.env.OPENAI_API_KEY;

  /*
   * If no AI API key is configured,
   * use deterministic fallback.
   */
  if (!geminiKey && !openAIKey) {
    console.warn(
      "[ai.service] No LLM API key found. Using fallback explanation."
    );

    return getFallbackAI(violationContext);
  }

  /*
   * Support both detectedPII and detectedData.
   */
  const detectedPII =
    violationContext.detectedPII ||
    violationContext.detectedData ||
    [];

  const prompt = `
You are a DPDPA (Digital Personal Data Protection Act) Compliance Expert.

A compliance violation HAS ALREADY BEEN DETECTED by a deterministic policy/rule engine.

Your job is ONLY to:
1. Explain why the detected violation is a compliance concern.
2. Recommend an actionable technical fix.

Do NOT decide whether the violation exists.

Violation Details:

- Type: ${violationContext.type}
- Severity: ${violationContext.severity}
- Risk Score: ${violationContext.riskScore}
- Source: ${violationContext.source || "N/A"}
- Endpoint: ${violationContext.endpoint || "N/A"}
- Service: ${violationContext.service || "N/A"}
- Detected PII: ${JSON.stringify(detectedPII)}
- Title: ${violationContext.title || "N/A"}
- Reason: ${violationContext.reason || "N/A"}

Response Guidelines (CRITICAL for dashboard UX):
- "explanation": Keep it under 2 sentences. Explain the specific DPDPA statutory provision breached (e.g. Sec 8(5) for log exposure, Sec 6(1) for purpose mismatch, Sec 8(7) for storage/retention). Do not use placeholders or generic statements.
- "recommendation": Keep it under 2 sentences. Provide a brief, precise, and actionable technical solution (e.g. specify log sanitization middleware, real-time consent token checks, or automated database TTL indexes).
- Tone must be objective, professional, and clear. Avoid any raw internal database codes, markdown syntax, or emojis.

Return ONLY valid JSON in exactly this structure:

{
  "explanation": "Detailed explanation of the DPDPA compliance concern.",
  "recommendation": "Specific and actionable engineering solution."
}

Do not include markdown or additional fields.`;

  try {

    let jsonText = "";

    // ==========================================
    // GEMINI
    // ==========================================

    if (geminiKey) {

      const ai = new GoogleGenAI({
        apiKey: geminiKey,
      });

      let response;

      try {

        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

      } catch (geminiError) {

        console.warn(
          "[ai.service] Primary Gemini model failed. Trying fallback model."
        );

        response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
      }

      jsonText = response.text;
    }

    // ==========================================
    // OPENAI
    // ==========================================

    else if (openAIKey) {

      const openai = new OpenAI({
        apiKey: openAIKey,
      });

      const response =
        await openai.chat.completions.create({
          model: "gpt-4o-mini",

          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],

          response_format: {
            type: "json_object",
          },
        });

      jsonText =
        response.choices[0].message.content;
    }

    // ==========================================
    // PARSE AI RESPONSE
    // ==========================================

    if (!jsonText) {
      throw new Error("Empty response received from LLM.");
    }

    const parsed = JSON.parse(
      jsonText.trim()
    );

    if (
      typeof parsed.explanation === "string" &&
      parsed.explanation.trim() &&
      typeof parsed.recommendation === "string" &&
      parsed.recommendation.trim()
    ) {

      return {
        explanation:
          parsed.explanation.trim(),

        recommendation:
          parsed.recommendation.trim(),
      };
    }

    throw new Error(
      "LLM response does not contain valid explanation and recommendation."
    );

  } catch (error) {

    console.warn(
      "[ai.service] LLM enrichment failed. Using fallback:",
      error.message
    );

    return getFallbackAI(
      violationContext
    );
  }
}

module.exports = {
  enrichWithAI,
  getFallbackAI,
};
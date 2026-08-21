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
          `Raw personal data (${detected}) was found in application logs even though the configured policy prohibits logging personal data. This creates an unnecessary exposure of personal information.`,

        recommendation:
          "Mask or remove raw personal data before writing application logs. Use log-sanitization middleware or pseudonymized identifiers such as customerId.",
      };

    case "PURPOSE_MISMATCH":
      return {
        explanation:
          `Personal data (${detected}) was processed for a purpose that does not match the declared or authorized processing purpose.`,

        recommendation:
          "Restrict processing to the declared purpose or update the consent and policy configuration before using the data for another purpose.",
      };

    case "RETENTION_VIOLATION":
      return {
        explanation:
          "Personal data has been retained beyond the maximum retention period defined by the configured policy.",

        recommendation:
          "Automatically delete, anonymize, or archive personal data when the configured retention period expires.",
      };

    default:
      return {
        explanation:
          "A potential DPDPA compliance violation was detected during application data processing.",

        recommendation:
          "Review the affected data flow, restrict unnecessary personal-data processing, and apply appropriate masking, deletion, or access controls.",
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
You are a DPDPA (Digital Personal Data Protection Act)
Compliance Expert.

A compliance violation HAS ALREADY BEEN DETECTED
by a deterministic policy/rule engine.

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

Return ONLY valid JSON in exactly this structure:

{
  "explanation": "Brief explanation of why this is a DPDPA compliance concern.",
  "recommendation": "Specific and actionable technical recommendation."
}

Do not include markdown.
Do not include additional fields.
`;

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
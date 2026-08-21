/**
 * @file Violation.js
 * @description Mongoose model for persisting compliance violations detected by the engine.
 */

const mongoose = require("mongoose");

const violationSchema = new mongoose.Schema(
  {
    violationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "organizationId is required"],
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.Mixed,
    },
    eventId: {
      type: String,
      required: true,
    },
    policyId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["PII_EXPOSURE", "PURPOSE_MISMATCH", "RETENTION_VIOLATION"],
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      index: true,
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    service: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      required: true,
      enum: ["API", "APPLICATION_LOG", "DATABASE_CHANGE"],
    },
    endpoint: {
      type: String,
      default: null,
    },
    detectedData: [
      {
        type: String,
      },
    ],
    title: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    aiExplanation: {
      type: String,
      default: "",
    },
    recommendation: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["OPEN", "ACKNOWLEDGED", "RESOLVED"],
      default: "OPEN",
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes required by compliance reporting dashboard
violationSchema.index({ organizationId: 1, status: 1 });
violationSchema.index({ organizationId: 1, severity: 1 });
violationSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model("Violation", violationSchema);

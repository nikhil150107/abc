/**
 * @file Policy.js
 * @description Mongoose model for defining DPDPA compliance policies.
 */

const mongoose = require("mongoose");

const policySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "organizationId is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Policy name is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Policy type is required"],
      enum: {
        values: ["PII_EXPOSURE", "PURPOSE_MISMATCH", "RETENTION_VIOLATION"],
        message: "{VALUE} is not a valid policy type",
      },
    },
    severity: {
      type: String,
      required: [true, "Policy severity is required"],
      enum: {
        values: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        message: "{VALUE} is not a valid severity level",
      },
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    config: {
      piiType: {
        type: String,
        trim: true,
      },
      allowedPurposes: [
        {
          type: String,
          trim: true,
        },
      ],
      loggingAllowed: {
        type: Boolean,
        default: false,
      },
      retentionDays: {
        type: Number,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookup of active policies by org and type
policySchema.index({ organizationId: 1, enabled: 1, type: 1 });

module.exports = mongoose.model("Policy", policySchema);

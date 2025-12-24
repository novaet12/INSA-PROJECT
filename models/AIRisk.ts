import mongoose, { Schema, models, model } from "mongoose";

const AIRiskSchema = new Schema(
    {
        // Core identifiers
        riskId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        riskName: {
            type: String,
            required: true,
            trim: true,
        },

        category: {
            type: String,
            required: true,
        },

        // Open / Closed
        status: {
            type: String,
            enum: ["open", "closed"],
            default: "open",
        },

        // Risk or Issue
        type: {
            type: String,
            enum: ["risk", "issue"],
            required: true,
        },

        // Threat or Opportunity
        threat: {
            type: String,
            enum: ["threat", "opportunity"],
            required: true,
        },

        // Risk level
        level: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            required: true,
        },

        // ===== PRE-MITIGATION =====
        preProbability: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },

        preImpact: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },

        preScore: {
            type: Number,
            required: true,
        },

        // Overall score (current)
        score: {
            type: Number,
            required: true,
        },

        // Costs
        costPre: {
            type: Number,
            default: 0,
        },

        costMitigation: {
            type: Number,
            default: 0,
        },

        // ===== POST-MITIGATION =====
        postProbability: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },

        postImpact: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },

        postScore: {
            type: Number,
            required: true,
        },

        costPost: {
            type: Number,
            default: 0,
        },

        // Description / notes
        description: {
            type: String,
            required: true,
        },

        // Company association
        company: {
            type: String,
            default: null,
        },

        // Questionnaire batch ID
        questionnaireId: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true, // createdAt / updatedAt
    }
);

// Prevent model overwrite in dev (Next.js hot reload)
export const AIRiskModel =
    models.AIRisk || model("AIRisk", AIRiskSchema);
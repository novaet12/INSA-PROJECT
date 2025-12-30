import mongoose, { Schema, Document } from "mongoose";

interface Risk extends Document {
  _id: string;
  riskId?: string; // Optional - if not present, it's a batch
  batchId?: string;
  riskName?: string;
  category?: string;
  status?: "open" | "closed";
  type?: "risk" | "issue";
  threat?: "threat" | "opportunity";
  level?: "low" | "medium" | "high" | "critical";
  preProbability?: number;
  preImpact?: number;
  preScore?: number;
  costPre?: number;
  postProbability?: number;
  postImpact?: number;
  postScore?: number;
  costPost?: number;
  score?: number;
  description?: string;
  company?: string;
  createdAt: Date;
  updatedAt: Date;
}

const riskSchema = new Schema<Risk>(
  {
    riskId: {
      type: String,
      sparse: true,
      index: true,
    },
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    riskName: String,
    category: String,
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    type: {
      type: String,
      enum: ["risk", "issue"],
      default: "risk",
    },
    threat: {
      type: String,
      enum: ["threat", "opportunity"],
      default: "threat",
    },
    level: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    preProbability: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    preImpact: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    preScore: {
      type: Number,
      min: 1,
      max: 25,
      default: 1,
    },
    costPre: {
      type: Number,
      default: 0,
    },
    postProbability: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    postImpact: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    postScore: {
      type: Number,
      min: 1,
      max: 25,
      default: 1,
    },
    costPost: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 1,
    },
    description: {
      type: String,
      default: "",
    },
    company: {
      type: String,
      default: "",
      index: true,
    },
  },
  { timestamps: true }
);

// Create compound index for efficient querying
riskSchema.index({ batchId: 1, riskId: 1 });
riskSchema.index({ company: 1, status: 1 });
riskSchema.index({ level: 1, status: 1 });

// Check if model already exists before creating (prevents OverwriteModelError in hot reload)
export const Risk =
  mongoose.models.Risk ||
  mongoose.model<Risk>("Risk", riskSchema);



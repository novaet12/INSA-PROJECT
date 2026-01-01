import mongoose, { Document, Model, Schema } from "mongoose";

export type RiskStatus =
  | "open"
  | "closed"
  | "mitigated"
  | "accepted"
  | "transferred";

export type RiskType = "risk" | "issue";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface IRisk extends Document {
  riskId: string;
  riskName: string;
  category: string;
  status: RiskStatus;
  type: RiskType;
  threat: string;
  level: RiskLevel;
  preProbability: number;
  preImpact: number;
  preScore: number;
  costPre: number;
  postProbability: number;
  postImpact: number;
  postScore: number;
  costPost: number;
  score: number;
  description: string;
  company?: string;
  batchId?: string;
  likelihood?: number;
  impact?: number;
  owner?: string;
  gap?: string;
  mitigation?: string;
  impactDescription?: string;
  questionnaireId?: string | null;
  createdAt?: Date;
}

const RiskSchema: Schema<IRisk> = new Schema(
  {
    riskId: { type: String, required: true, unique: true },
    riskName: { type: String, required: true },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "closed", "mitigated", "accepted", "transferred"],
      default: "open",
      required: true,
    },
    type: {
      type: String,
      enum: ["risk", "issue"],
      required: true,
    },
    threat: { type: String, required: true },
    level: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    preProbability: { type: Number, required: true },
    preImpact: { type: Number, required: true },
    preScore: { type: Number, required: true },
    costPre: { type: Number, required: true },
    postProbability: { type: Number, required: true },
    postImpact: { type: Number, required: true },
    postScore: { type: Number, required: true },
    costPost: { type: Number, required: true },
    score: { type: Number, required: true },
    description: { type: String, required: true },
    company: { type: String },
    batchId: { type: String },
    likelihood: { type: Number },
    impact: { type: Number },
    owner: { type: String },
    gap: { type: String },
    mitigation: { type: String },
    impactDescription: { type: String },
    questionnaireId: { type: String, default: null },
  },
  {
    timestamps: true, // adds createdAt and updatedAt as Date
  }
);

const Risk: Model<IRisk> =
  mongoose.models.Risk || mongoose.model<IRisk>("Risk", RiskSchema);

export default Risk;

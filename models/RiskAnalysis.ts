import mongoose, { Document, Model, Schema } from "mongoose";

export type RiskCategory = "High" | "Medium" | "Low";

export interface IVulnerability {
  description: string;
  likelihood: number; // 1-5
  impact: number; // 1-5
  category: RiskCategory;
  recommendation: string;
}

export interface IRiskAnalysis extends Document {
  questionnaireId: mongoose.Types.ObjectId;
  vulnerabilities: IVulnerability[];
  riskScore: number;
  category: RiskCategory;
  inherentRisk: number;
  residualRisk: number;
  aiInsights: string;
  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VulnerabilitySchema = new Schema({
  description: { type: String, required: true },
  likelihood: { type: Number, required: true, min: 1, max: 5 },
  impact: { type: Number, required: true, min: 1, max: 5 },
  category: {
    type: String,
    enum: ["High", "Medium", "Low"],
    required: true,
  },
  recommendation: { type: String, required: true },
});

const RiskAnalysisSchema: Schema<IRiskAnalysis> = new Schema(
  {
    questionnaireId: {
      type: Schema.Types.ObjectId,
      ref: "Questionnaire",
      required: true,
    },
    vulnerabilities: [VulnerabilitySchema],
    riskScore: { type: Number, required: true, min: 1, max: 25 },
    category: {
      type: String,
      enum: ["High", "Medium", "Low"],
      required: true,
    },
    inherentRisk: { type: Number, required: true, min: 1, max: 25 },
    residualRisk: { type: Number, required: true, min: 1, max: 25 },
    aiInsights: { type: String, required: true },
    analyzedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const RiskAnalysis: Model<IRiskAnalysis> =
  mongoose.models.RiskAnalysis ||
  mongoose.model<IRiskAnalysis>("RiskAnalysis", RiskAnalysisSchema);

export default RiskAnalysis;


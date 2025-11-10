import mongoose, { Document, Model, Schema } from "mongoose";

export type RiskStatus = "open" | "mitigated" | "accepted" | "transferred";

export type RiskLevel = "critical" | "high" | "medium" | "low";

export interface IRiskRegister extends Document {
  riskId: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  status: RiskStatus;
  level: RiskLevel;
  mitigationStrategy: string;
  owner: string;
  updatedAt: Date;
  createdAt: Date;
}

const RiskRegisterSchema: Schema<IRiskRegister> = new Schema(
  {
    riskId: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    likelihood: { type: Number, required: true, min: 1, max: 5 },
    impact: { type: Number, required: true, min: 1, max: 5 },
    status: {
      type: String,
      enum: ["open", "mitigated", "accepted", "transferred"],
      default: "open",
    },
    level: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "low",
    },
    mitigationStrategy: { type: String, default: "" },
    owner: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const RiskRegister: Model<IRiskRegister> =
  mongoose.models.RiskRegister ||
  mongoose.model<IRiskRegister>("RiskRegister", RiskRegisterSchema);

export default RiskRegister;


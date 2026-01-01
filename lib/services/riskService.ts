/* eslint-disable @typescript-eslint/no-explicit-any */
import connectDB from "@/lib/mongodb";
import Risk from "@/models/RiskRegister";

// DTO aligned with your Risk interface but only for creation
export interface CreateRiskDTO {
  riskId: string;
  riskName: string;
  category: string;
  status: "open" | "closed" | "mitigated" | "accepted" | "transferred";
  type: "risk" | "issue";
  threat: string;
  level: "low" | "medium" | "high" | "critical";
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
}

export class RiskService {
  // Create a new risk
  static async createRisk(data: CreateRiskDTO) {
    await connectDB();

    const risk = await Risk.create({
      ...data,
      createdAt: new Date(),
    });

    return risk;
  }

  // Get all risks with optional filters
  static async getRisks(filters?: {
    company?: string;
    level?: "low" | "medium" | "high" | "critical";
    status?: "open" | "closed" | "mitigated" | "accepted" | "transferred";
    dateFrom?: string;
    dateTo?: string;
    batchId?: string;
  }) {
    await connectDB();

    const query: any = {};

    if (filters?.company) {
      query.company = { $regex: filters.company, $options: "i" };
    }

    if (filters?.level) {
      query.level = filters.level;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.batchId) {
      query.batchId = filters.batchId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    const risks = await Risk.find(query).sort({ createdAt: -1 });
    return risks;
  }

  // Get risk by Mongo _id
  static async getRiskById(id: string) {
    await connectDB();
    const risk = await Risk.findById(id);
    return risk;
  }

  // Get risk by business riskId
  static async getRiskByRiskId(riskId: string) {
    await connectDB();
    const risk = await Risk.findOne({ riskId });
    return risk;
  }

  // Update risk (by Mongo _id)
  static async updateRisk(
    id: string,
    data: Partial<CreateRiskDTO>
  ) {
    await connectDB();

    const risk = await Risk.findByIdAndUpdate(
      id,
      { ...data },
      { new: true, runValidators: true }
    );

    return risk;
  }

  // Delete risk (by Mongo _id)
  static async deleteRisk(id: string) {
    await connectDB();
    const result = await Risk.findByIdAndDelete(id);
    return result;
  }

  // Risk statistics based on level and status
  static async getRiskStats() {
    await connectDB();

    const risks = await Risk.find({});

    const stats = {
      totalRisks: risks.length,
      critical: risks.filter((r) => r.level === "critical").length,
      high: risks.filter((r) => r.level === "high").length,
      medium: risks.filter((r) => r.level === "medium").length,
      low: risks.filter((r) => r.level === "low").length,
      open: risks.filter((r) => r.status === "open").length,
      closed: risks.filter((r) => r.status === "closed").length,
      mitigated: risks.filter((r) => r.status === "mitigated").length,
      accepted: risks.filter((r) => r.status === "accepted").length,
      transferred: risks.filter((r) => r.status === "transferred").length,
    };

    return stats;
  }

  // Calculate risk score (you can use for pre/post or generic)
  static calculateRiskScore(likelihood: number, impact: number): number {
    return likelihood * impact;
  }

  // Determine risk level based on score
  static determineRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
    if (score >= 20) return "critical";
    if (score >= 12) return "high";
    if (score >= 6) return "medium";
    return "low";
  }
}

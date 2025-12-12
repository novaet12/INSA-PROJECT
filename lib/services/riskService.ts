/* eslint-disable @typescript-eslint/no-explicit-any */
import connectDB from "@/lib/mongodb";
import RiskRegister from "@/models/RiskRegister";

export interface CreateRiskDTO {
  description: string;
  company?: string;
  category: string;
  level: string;
  likelihood: number;
  impact: number;
  status: string;
  owner: string;
  gap?: string;
  threat?: string;
  mitigation?: string;
  mitigationStrategy?: string;
  mitigationCost?: number;
  mitigationEffectiveness?: number;
}

export class RiskService {
  // Create a new risk
  static async createRisk(data: CreateRiskDTO) {
    await connectDB();

    const risk = await RiskRegister.create({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return risk;
  }

  // Get all risks with optional filters
  static async getRisks(filters?: {
    company?: string;
    level?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
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

    if (filters?.dateFrom || filters?.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    const risks = await RiskRegister.find(query).sort({ createdAt: -1 });
    return risks;
  }

  // Get risk by ID
  static async getRiskById(riskId: string) {
    await connectDB();
    const risk = await RiskRegister.findById(riskId);
    return risk;
  }

  // Update risk
  static async updateRisk(riskId: string, data: Partial<CreateRiskDTO>) {
    await connectDB();

    const risk = await RiskRegister.findByIdAndUpdate(
      riskId,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    return risk;
  }

  // Delete risk
  static async deleteRisk(riskId: string) {
    await connectDB();
    const result = await RiskRegister.findByIdAndDelete(riskId);
    return result;
  }

  // Get risk statistics
  static async getRiskStats() {
    await connectDB();

    const risks = await RiskRegister.find({});

    const stats = {
      totalRisks: risks.length,
      critical: risks.filter(r => r.level === "critical").length,
      high: risks.filter(r => r.level === "high").length,
      medium: risks.filter(r => r.level === "medium").length,
      low: risks.filter(r => r.level === "low").length,
      open: risks.filter(r => r.status === "open").length,
      mitigated: risks.filter(r => r.status === "mitigated").length,
      accepted: risks.filter(r => r.status === "accepted").length,
      transferred: risks.filter(r => r.status === "transferred").length,
    };

    return stats;
  }

  // Calculate risk score
  static calculateRiskScore(likelihood: number, impact: number): number {
    return likelihood * impact;
  }

  // Determine risk level based on score
  static determineRiskLevel(score: number): string {
    if (score >= 20) return "critical";
    if (score >= 12) return "high";
    if (score >= 6) return "medium";
    return "low";
  }
}

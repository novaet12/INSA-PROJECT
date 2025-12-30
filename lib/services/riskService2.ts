//import { Risk } from "@/lib/models/RiskModel";
import { Risk } from "@/models/RiskModel";

interface CreateRiskInput {
  riskId: string;
  riskName: string;
  category: string;
  status: "open" | "closed";
  type: "risk" | "issue";
  threat: "threat" | "opportunity";
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
}

interface CreateBatchInput {
  batchId: string;
  company?: string;
}

interface ListFilters {
  batchId?: string;
  category?: string;
  company?: string;
  status?: "open" | "closed";
  level?: "low" | "medium" | "high" | "critical";
  type?: "risk" | "issue";
  nature?: "threat" | "opportunity";
}export class RiskService {
  static async createRisk(input: CreateRiskInput) {
    try {
      const risk = new Risk({
        riskId: input.riskId,
        riskName: input.riskName,
        category: input.category,
        status: input.status,
        type: input.type,
        threat: input.threat,
        level: input.level,
        preProbability: input.preProbability,
        preImpact: input.preImpact,
        preScore: input.preScore,
        costPre: input.costPre,
        postProbability: input.postProbability,
        postImpact: input.postImpact,
        postScore: input.postScore,
        costPost: input.costPost,
        score: input.score,
        description: input.description,
        company: input.company || "",
        batchId: input.batchId || "",
      });

      return await risk.save();
    } catch (error) {
      throw new Error(
        `Failed to create risk: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static async createBatch(input: CreateBatchInput) {
    try {
      // Check if batch already exists
      const existingBatch = await Risk.findOne({
        batchId: input.batchId,
        riskId: { $exists: false },
      });

      if (existingBatch) {
        throw new Error(`Batch with ID ${input.batchId} already exists`);
      }

      // Create a batch document (risk document without riskId)
      const batch = new Risk({
        batchId: input.batchId,
        company: input.company || "",
        // No riskId means it's a batch
      });

      return await batch.save();
    } catch (error) {
      throw new Error(
        `Failed to create batch: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static async listRisks(
    filters: ListFilters,
    sortBy: "createdAt" | "score" | "level" | "riskName" = "createdAt",
    sortOrder: "asc" | "desc" = "desc"
  ) {
    try {
      const query: any = {
        riskId: { $exists: true }, // Only get risks, not batches
      };

      if (filters.batchId) query.batchId = filters.batchId;
      if (filters.category) query.category = filters.category;
      if (filters.company) query.company = filters.company;
      if (filters.status) query.status = filters.status;
      if (filters.level) query.level = filters.level;
      if (filters.type) query.type = filters.type;
      if (filters.nature) query.threat = filters.nature;

      const sortDirection = sortOrder === "asc" ? 1 : -1;
      const sortObj: any = {};
      sortObj[sortBy] = sortDirection;

      const risks = await Risk.find(query).sort(sortObj).lean();

      return risks;
    } catch (error) {
      throw new Error(
        `Failed to list risks: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static async listBatches(filters?: { company?: string }) {
    try {
      const query: any = {
        riskId: { $exists: false }, // Only get batches, not risks
      };

      if (filters?.company) query.company = filters.company;

      const batches = await Risk.find(query)
        .sort({ createdAt: -1 })
        .lean();

      // Enrich batches with risk count
      const enrichedBatches = await Promise.all(
        batches.map(async (batch: any) => {
          const riskCount = await Risk.countDocuments({
            batchId: batch.batchId,
            riskId: { $exists: true },
          });

          return {
            ...batch,
            riskCount,
          };
        })
      );

      return enrichedBatches;
    } catch (error) {
      throw new Error(
        `Failed to list batches: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }


  static async getRisksByBatchId(batchId: string) {
    try {
      const risks = await Risk.find({
        batchId,
        riskId: { $exists: true },
      })
        .sort({ createdAt: -1 })
        .lean();

      return risks;
    } catch (error) {
      throw new Error(
        `Failed to get risks for batch: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static async getBatchById(batchId: string) {
    try {
      const batch = await Risk.findOne({
        batchId,
        riskId: { $exists: false },
      }).lean();

      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      return batch;
    } catch (error) {
      throw new Error(
        `Failed to get batch: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static async updateRisk(riskId: string, updates: Partial<CreateRiskInput>) {
    try {
      const risk = await Risk.findOneAndUpdate(
        { riskId },
        { $set: updates },
        { new: true }
      );

      if (!risk) {
        throw new Error(`Risk ${riskId} not found`);
      }

      return risk;
    } catch (error) {
      throw new Error(
        `Failed to update risk: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static async deleteRisk(riskId: string) {
    try {
      const result = await Risk.findOneAndDelete({ riskId });

      if (!result) {
        throw new Error(`Risk ${riskId} not found`);
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to delete risk: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static async deleteBatch(batchId: string) {
    try {
      // Delete batch and all associated risks
      await Risk.deleteMany({ batchId });

      return { success: true, message: `Batch ${batchId} deleted` };
    } catch (error) {
      throw new Error(
        `Failed to delete batch: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

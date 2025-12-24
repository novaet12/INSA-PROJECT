import connectDB from "@/lib/mongodb";
import { AIRiskModel } from "@/models/AIRisk";

/**
 * AI Registered Risk Service
 * Handles create & list operations
 */
export class AIRiskService {
    /**
     * Create a new AI-registered risk
     */
    static async createRisk(data: {
        riskId: string;
        riskName: string;
        category: string;
        status: "open" | "closed";
        type: "risk" | "issue";
        threat: string;
        level: "low" | "medium" | "high" | "critical";

        preProbability: number;
        preImpact: number;
        preScore: number;
        score: number;

        costPre: number;
        costMitigation: number;

        postProbability: number;
        postImpact: number;
        postScore: number;
        costPost: number;

        description: string;
    }) {
        await connectDB();

        const risk = await AIRiskModel.create({
            riskId: data.riskId,
            riskName: data.riskName,
            category: data.category,
            status: data.status,
            type: data.type,
            threat: data.threat,
            level: data.level,

            preProbability: data.preProbability,
            preImpact: data.preImpact,
            preScore: data.preScore,
            score: data.score,

            costPre: data.costPre,
            costMitigation: data.costMitigation,

            postProbability: data.postProbability,
            postImpact: data.postImpact,
            postScore: data.postScore,
            costPost: data.costPost,

            description: data.description,
        });

        return risk;
    }

    /**
     * List all AI-registered risks
     * Supports optional filters for table views
     */
    static async listRisks(filters?: {
        category?: string;
        status?: "open" | "closed";
        level?: "low" | "medium" | "high" | "critical";
        type?: "risk" | "issue";
    }) {
        await connectDB();

        const query: any = {};

        if (filters?.category) query.category = filters.category;
        if (filters?.status) query.status = filters.status;
        if (filters?.level) query.level = filters.level;
        if (filters?.type) query.type = filters.type;

        return AIRiskModel.find(query).sort({ createdAt: -1 });
    }

    /**
     * Get a single risk by Risk ID
     */
    static async getByRiskId(riskId: string) {
        await connectDB();
        return AIRiskModel.findOne({ riskId });
    }

    /**
     * Update risk status (Open / Closed)
     */
    static async updateStatus(
        riskId: string,
        status: "open" | "closed"
    ) {
        await connectDB();

        return AIRiskModel.findOneAndUpdate(
            { riskId },
            { status },
            { new: true }
        );
    }
}
export default AIRiskService;

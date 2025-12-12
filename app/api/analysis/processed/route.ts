import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RiskAnalysis from "@/models/RiskAnalysis";

export async function GET() {
    try {
        // TEMPORARILY DISABLED FOR TESTING
        // const session = await getSession();
        // if (!session) {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        await dbConnect();

        const analyses = await RiskAnalysis.find({})
            .sort({ createdAt: -1 })
            .lean();

        const formattedAnalyses = analyses.map(analysis => {
            // Combine all analyses from all levels
            const allAnalyses = [
                ...(analysis.operational || []),
                ...(analysis.tactical || []),
                ...(analysis.strategic || [])
            ];

            // Create risk matrix data for visualization
            const riskMatrix: { [key: string]: number } = {};
            allAnalyses.forEach((item: any) => {
                const key = `${item.analysis.likelihood}-${item.analysis.impact}`;
                riskMatrix[key] = (riskMatrix[key] || 0) + 1;
            });

            const riskMatrixArray = Object.entries(riskMatrix).map(([key, count]) => {
                const [likelihood, impact] = key.split('-').map(Number);
                return { likelihood, impact, count };
            });

            return {
                _id: analysis._id.toString(),
                company: analysis.company,
                category: analysis.category,
                date: analysis.createdAt,
                analyses: allAnalyses.map((a: any) => ({
                    questionId: a.questionId,
                    level: a.level,
                    question: a.question,
                    answer: a.answer,
                    likelihood: a.analysis?.likelihood || 0,
                    impact: a.analysis?.impact || 0,
                    riskScore: a.analysis?.riskScore || 0,
                    riskLevel: a.analysis?.riskLevel || 'UNKNOWN',
                    gap: a.analysis?.gap || '',
                    threat: a.analysis?.threat || '',
                    mitigation: a.analysis?.mitigation || ''
                })),
                riskMatrix: riskMatrixArray,
                summary: analysis.summary
            };
        });

        return NextResponse.json({
            success: true,
            assessments: formattedAnalyses
        });
    } catch (error) {
        console.error("Error fetching processed analyses:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({
            error: message || "Failed to fetch analyses"
        }, { status: 500 });
    }
}

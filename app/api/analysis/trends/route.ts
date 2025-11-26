import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RiskAnalysis from "@/models/RiskAnalysis";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const analyses = await RiskAnalysis.find()
      .sort({ createdAt: 1 })
      .limit(100);

    // Group by month
    const monthlyData: { [key: string]: { high: number; medium: number; low: number; total: number } } = {};

    analyses.forEach((analysis) => {
      const date = new Date(analysis.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { high: 0, medium: 0, low: 0, total: 0 };
      }

      monthlyData[monthKey].total++;
      if (analysis.category === "High") monthlyData[monthKey].high++;
      if (analysis.category === "Medium") monthlyData[monthKey].medium++;
      if (analysis.category === "Low") monthlyData[monthKey].low++;
    });

    // Convert to array format
    const trendData = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
    }));

    // Calculate risk score trends
    const riskScoreTrends = analyses.map((analysis) => ({
      date: analysis.createdAt,
      inherentRisk: analysis.inherentRisk,
      residualRisk: analysis.residualRisk,
      riskScore: analysis.riskScore,
    }));

    return NextResponse.json({
      success: true,
      monthlyTrends: trendData,
      riskScoreTrends,
    });
  } catch (error: any) {
    console.error("Error fetching trends:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch trends" },
      { status: 500 }
    );
  }
}


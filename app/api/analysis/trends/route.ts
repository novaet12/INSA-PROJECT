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

      // Use summary.overall.riskDistribution if available
      const dist = analysis?.summary?.overall?.riskDistribution || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, VERY_LOW: 0 };
      const highCount = (dist.CRITICAL || 0) + (dist.HIGH || 0);
      const mediumCount = dist.MEDIUM || 0;
      const lowCount = (dist.LOW || 0) + (dist.VERY_LOW || 0);

      monthlyData[monthKey].total += highCount + mediumCount + lowCount;
      monthlyData[monthKey].high += highCount;
      monthlyData[monthKey].medium += mediumCount;
      monthlyData[monthKey].low += lowCount;
    });

    // Convert to array format
    const trendData = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
    }));

    // Calculate risk score trends
    const riskScoreTrends = analyses.map((analysis) => ({
      date: analysis.createdAt,
      inherentRisk: analysis?.summary?.overall?.inherentRisk || null,
      residualRisk: analysis?.summary?.overall?.residualRisk || null,
      riskScore: analysis?.summary?.overall?.averageRiskScore || null,
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


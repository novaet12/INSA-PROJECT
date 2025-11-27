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

    const analyses = await RiskAnalysis.find().populate("questionnaireId");

    // Build 5x5 matrix
    const matrix: { [key: string]: number } = {};
    
    analyses.forEach((analysis) => {
      const all = [ ...(analysis.operational || []), ...(analysis.tactical || []), ...(analysis.strategic || []) ];
      all.forEach((item: any) => {
        const likelihood = item.analysis?.likelihood || 0;
        const impact = item.analysis?.impact || 0;
        const key = `${likelihood}-${impact}`;
        matrix[key] = (matrix[key] || 0) + 1;
      });
    });

    // Convert to array format
    const matrixData = [];
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      for (let impact = 1; impact <= 5; impact++) {
        const key = `${likelihood}-${impact}`;
        matrixData.push({
          likelihood,
          impact,
          count: matrix[key] || 0,
        });
      }
    }

    // Calculate ALE (Annual Loss Expectancy) - simplified version
    // ALE = Single Loss Expectancy (SLE) × Annualized Rate of Occurrence (ARO)
    // For this system, we'll use: ALE = Impact Score × Likelihood Score × Asset Value Factor
    // Asset Value Factor is assumed to be $10,000 per risk point
    const assetValueFactor = 10000;
    const aleData = analyses.flatMap((analysis) => {
      const all = [ ...(analysis.operational || []), ...(analysis.tactical || []), ...(analysis.strategic || []) ];
      return all.map((item: any) => {
        const likelihood = item.analysis?.likelihood || 0;
        const impact = item.analysis?.impact || 0;
        return {
          description: item.question || '',
          likelihood,
          impact,
          sle: impact * assetValueFactor,
          aro: likelihood / 5,
          ale: (impact * assetValueFactor) * (likelihood / 5),
          category: item.section || 'N/A'
        };
      });
    });

    const totalALE = aleData.reduce((sum, item) => sum + item.ale, 0);

    return NextResponse.json({
      success: true,
      matrix: matrixData,
      ale: {
        total: totalALE,
        risks: aleData,
        average: aleData.length > 0 ? totalALE / aleData.length : 0,
      },
    });
  } catch (error: any) {
    console.error("Error fetching risk matrix:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch risk matrix" },
      { status: 500 }
    );
  }
}


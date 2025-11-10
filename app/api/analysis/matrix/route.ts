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
      analysis.vulnerabilities.forEach((vuln) => {
        const key = `${vuln.likelihood}-${vuln.impact}`;
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
    const aleData = analyses.flatMap((analysis) =>
      analysis.vulnerabilities.map((vuln) => ({
        description: vuln.description,
        likelihood: vuln.likelihood,
        impact: vuln.impact,
        sle: vuln.impact * assetValueFactor, // Single Loss Expectancy
        aro: vuln.likelihood / 5, // Annualized Rate (normalized 0-1)
        ale: (vuln.impact * assetValueFactor) * (vuln.likelihood / 5), // Annual Loss Expectancy
        category: vuln.category,
      }))
    );

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


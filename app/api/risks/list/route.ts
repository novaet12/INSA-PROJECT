import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RiskService } from "@/lib/services/riskService";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      company: searchParams.get("company") || undefined,
      level: (searchParams.get("level") as
        | "low"
        | "medium"
        | "high"
        | "critical"
        | null) || undefined,
      status: (searchParams.get("status") as
        | "open"
        | "closed"
        | "mitigated"
        | "accepted"
        | "transferred"
        | null) || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      batchId: searchParams.get("batchId") || undefined,
    };

    // Fetch risks from service
    let risks = await RiskService.getRisks(filters);

    // Filter out risks with no significant gap
    risks = risks.filter(
      (risk) => risk.gap !== "No significant gap identified"
    );

    // Return only the relevant fields (now matching full Risk interface)
    const cleanedRisks = risks.map((risk) => ({
      riskId: risk.riskId,
      riskName: risk.riskName,
      category: risk.category,
      status: risk.status,
      type: risk.type,
      threat: risk.threat,
      level: risk.level,
      preProbability: risk.preProbability,
      preImpact: risk.preImpact,
      preScore: risk.preScore,
      costPre: risk.costPre,
      postProbability: risk.postProbability,
      postImpact: risk.postImpact,
      postScore: risk.postScore,
      costPost: risk.costPost,
      score: risk.score,
      description: risk.description,
      company: risk.company,
      batchId: risk.batchId,
      likelihood: risk.likelihood,
      impact: risk.impact,
      owner: risk.owner,
      gap: risk.gap,
      mitigation: risk.mitigation,
      impactDescription: risk.impactDescription,
      questionnaireId: risk.questionnaireId,
      createdAt: risk.createdAt,
    }));

    return NextResponse.json({
      success: true,
      risks: cleanedRisks,
    });
  } catch (error) {
    console.error("Error fetching risks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch risks" },
      { status: 500 }
    );
  }
}

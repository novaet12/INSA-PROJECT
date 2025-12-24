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
      level: searchParams.get("level") || undefined,
      status: searchParams.get("status") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    };

    // Fetch risks from service
    let risks = await RiskService.getRisks(filters);

    // Filter out risks with no significant gap
    risks = risks.filter(risk => risk.gap !== "No significant gap identified");

    // Return only the relevant fields
    const cleanedRisks = risks.map(risk => ({
      riskId: risk.riskId,
      description: risk.description,
      company: risk.company,
      category: risk.category,
      level: risk.level,
      likelihood: risk.likelihood,
      impact: risk.impact,
      status: risk.status,
      owner: risk.owner,
      gap: risk.gap,
      threat: risk.threat,
      mitigation: risk.mitigation,
      questionnaireId: risk.questionnaireId, // <-- add this
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

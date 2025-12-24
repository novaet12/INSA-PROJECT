import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AIRiskService } from "@/lib/services/aiRiskService";

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
      category: searchParams.get("category") || undefined,
      company: searchParams.get("company") || undefined,
      status: (searchParams.get("status") as "open" | "closed") || undefined,
      level:
        (searchParams.get("level") as
          | "low"
          | "medium"
          | "high"
          | "critical") || undefined,
      type: (searchParams.get("type") as "risk" | "issue") || undefined,
      nature:
        (searchParams.get("nature") as "threat" | "opportunity") || undefined,
      questionnaireId: searchParams.get("questionnaireId") || undefined,
    };

    // Sorting parameters
    const sortBy =
      (searchParams.get("sortBy") as
        | "createdAt"
        | "score"
        | "level"
        | "riskName") || "createdAt";
    const sortOrder =
      (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

    const risks = await AIRiskService.listRisks(filters, sortBy, sortOrder);

    return NextResponse.json({
      success: true,
      risks,
    });
  } catch (error) {
    console.error("Error fetching AI registered risks:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: message || "Failed to fetch AI registered risks",
      },
      { status: 500 }
    );
  }
}
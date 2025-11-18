// app/api/risks/create/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RiskService } from "@/lib/services/riskService";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.description || !body.category || !body.level || !body.owner) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate likelihood and impact
    if (body.likelihood < 1 || body.likelihood > 5 || body.impact < 1 || body.impact > 5) {
      return NextResponse.json(
        { success: false, error: "Likelihood and impact must be between 1 and 5" },
        { status: 400 }
      );
    }

    const risk = await RiskService.createRisk({
      description: body.description,
      company: body.company,
      category: body.category,
      level: body.level,
      likelihood: body.likelihood,
      impact: body.impact,
      status: body.status || "open",
      owner: body.owner,
      gap: body.gap,
      threat: body.threat,
      mitigation: body.mitigation,
      mitigationStrategy: body.mitigationStrategy,
      mitigationCost: body.mitigationCost,
      mitigationEffectiveness: body.mitigationEffectiveness,
    });

    return NextResponse.json({
      success: true,
      risk,
    });
  } catch (error) {
    console.error("Error creating risk:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create risk" },
      { status: 500 }
    );
  }
}

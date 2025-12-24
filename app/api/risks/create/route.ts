import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RiskService } from "@/lib/services/riskService";
import { v4 as uuidv4 } from "uuid";

// Allowed risk levels (match your Mongoose enum)
const VALID_LEVELS = ["low", "medium", "high", "critical"];

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

    // Required fields check
    if (!body.description || !body.category || !body.level || !body.owner) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Reject if gap has no significant gap
    if (body.gap === "No significant gap identified") {
      return NextResponse.json(
        { success: false, error: "Cannot register a risk with no significant gap" },
        { status: 400 }
      );
    }

    // Likelihood and impact validation
    if (body.likelihood < 1 || body.likelihood > 5 || body.impact < 1 || body.impact > 5) {
      return NextResponse.json(
        { success: false, error: "Likelihood and impact must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Map level to valid enum, default to 'low' if invalid
    const level = VALID_LEVELS.includes(body.level) ? body.level : "low";

    const risk = await RiskService.createRisk({
      riskId: uuidv4(), // generate unique ID
      description: body.description,
      company: body.company,
      category: body.category,
      level,
      likelihood: body.likelihood,
      impact: body.impact,
      status: body.status || "open",
      owner: body.owner,
      gap: body.gap,
      threat: body.threat,
      mitigation: body.mitigation,
      questionnaireId: body.questionnaireId || null, // <-- attach questionnaire ID
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

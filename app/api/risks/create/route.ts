import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RiskRegister from "@/models/RiskRegister";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      description,
      category,
      likelihood,
      impact,
      status,
      mitigationStrategy,
      owner,
      level,
    } = await req.json();

    if (!description || !category || !likelihood || !impact) {
      return NextResponse.json(
        { error: "Description, category, likelihood, and impact are required" },
        { status: 400 }
      );
    }

    // validate level if provided
    const allowedLevels = ["critical", "high", "medium", "low"];
    const chosenLevel = level && allowedLevels.includes(level) ? level : "low";

    if (likelihood < 1 || likelihood > 5 || impact < 1 || impact > 5) {
      return NextResponse.json(
        { error: "Likelihood and impact must be between 1 and 5" },
        { status: 400 }
      );
    }

    await dbConnect();

    const userEmail = (session.user as any)?.email || "unknown";
    const riskId = `RISK-MANUAL-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const riskRegister = new RiskRegister({
      riskId,
      description,
      category,
      likelihood,
      impact,
      status: status || "open",
      level: chosenLevel,
      mitigationStrategy: mitigationStrategy || "",
      owner: owner || userEmail,
    });

    const savedRisk = await riskRegister.save();

    return NextResponse.json({
      success: true,
      risk: savedRisk,
    });
  } catch (error: any) {
    console.error("Error creating risk:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Risk with this ID already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create risk" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RiskRegister from "@/models/RiskRegister";

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      riskId,
      description,
      category,
      likelihood,
      impact,
      status,
      mitigationStrategy,
      owner,
    } = await req.json();

    if (!riskId) {
      return NextResponse.json(
        { error: "Risk ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const risk = await RiskRegister.findOne({ riskId });
    if (!risk) {
      return NextResponse.json(
        { error: "Risk not found" },
        { status: 404 }
      );
    }

    // Update fields if provided
    if (description !== undefined) risk.description = description;
    if (category !== undefined) risk.category = category;
    if (likelihood !== undefined) {
      if (likelihood < 1 || likelihood > 5) {
        return NextResponse.json(
          { error: "Likelihood must be between 1 and 5" },
          { status: 400 }
        );
      }
      risk.likelihood = likelihood;
    }
    if (impact !== undefined) {
      if (impact < 1 || impact > 5) {
        return NextResponse.json(
          { error: "Impact must be between 1 and 5" },
          { status: 400 }
        );
      }
      risk.impact = impact;
    }
    if (status !== undefined) risk.status = status;
    if (mitigationStrategy !== undefined)
      risk.mitigationStrategy = mitigationStrategy;
    if (owner !== undefined) risk.owner = owner;

    risk.updatedAt = new Date();
    await risk.save();

    return NextResponse.json({
      success: true,
      risk,
    });
  } catch (error: any) {
    console.error("Error updating risk:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update risk" },
      { status: 500 }
    );
  }
}


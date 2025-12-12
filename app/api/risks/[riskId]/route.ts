import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RiskService } from "@/lib/services/riskService";

// GET single risk
export async function GET(
  request: Request,
  { params }: { params: { riskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const risk = await RiskService.getRiskById(params.riskId);

    if (!risk) {
      return NextResponse.json(
        { success: false, error: "Risk not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      risk,
    });
  } catch (error) {
    console.error("Error fetching risk:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch risk" },
      { status: 500 }
    );
  }
}

// PATCH update risk
export async function PATCH(
  request: Request,
  { params }: { params: { riskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const risk = await RiskService.updateRisk(params.riskId, body);

    if (!risk) {
      return NextResponse.json(
        { success: false, error: "Risk not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      risk,
    });
  } catch (error) {
    console.error("Error updating risk:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update risk" },
      { status: 500 }
    );
  }
}

// DELETE risk
export async function DELETE(
  request: Request,
  { params }: { params: { riskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await RiskService.deleteRisk(params.riskId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Risk not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Risk deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting risk:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete risk" },
      { status: 500 }
    );
  }
}

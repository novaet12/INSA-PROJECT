import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RiskRegister from "@/models/RiskRegister";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const riskId = searchParams.get("riskId");

    if (!riskId) {
      return NextResponse.json(
        { error: "Risk ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const risk = await RiskRegister.findOneAndDelete({ riskId });
    if (!risk) {
      return NextResponse.json(
        { error: "Risk not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Risk deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting risk:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete risk" },
      { status: 500 }
    );
  }
}


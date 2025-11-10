import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RiskRegister from "@/models/RiskRegister";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }

    const risks = await RiskRegister.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({
      success: true,
      risks,
    });
  } catch (error: any) {
    console.error("Error fetching risks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch risks" },
      { status: 500 }
    );
  }
}


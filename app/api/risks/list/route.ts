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

    const risks = await RiskService.getRisks(filters);

    return NextResponse.json({
      success: true,
      risks,
    });
  } catch (error) {
    console.error("Error fetching risks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch risks" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RiskService } from "@/lib/services/riskService2";

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

    // Check if requesting batches or risks within a batch
    const batchId = searchParams.get("batchId");

    if (batchId) {
      // Fetch risks for a specific batch
      const filters = {
        batchId,
        category: searchParams.get("category") || undefined,
        status: (searchParams.get("status") as "open" | "closed") || undefined,
        level:
          (searchParams.get("level") as
            | "low"
            | "medium"
            | "high"
            | "critical") || undefined,
        type: (searchParams.get("type") as "risk" | "issue") || undefined,
        nature:
          (searchParams.get("nature") as "threat" | "opportunity") ||
          undefined,
      };

      const sortBy =
        (searchParams.get("sortBy") as
          | "createdAt"
          | "score"
          | "level"
          | "riskName") || "createdAt";
      const sortOrder =
        (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

      const risks = await RiskService.listRisks(filters, sortBy, sortOrder);

      return NextResponse.json({
        success: true,
        risks,
      });
    } else {
      // Fetch all batches with optional company filter
      const companyFilter = searchParams.get("company") || undefined;

      const batches = await RiskService.listBatches({ company: companyFilter });

      return NextResponse.json({
        success: true,
        batches,
      });
    }
  } catch (error) {
    console.error("Error fetching registered risks/batches:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: message || "Failed to fetch registered risks/batches",
      },
      { status: 500 }
    );
  }
}

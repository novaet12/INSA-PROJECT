import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RiskService } from "@/lib/services/riskService2";

const VALID_LEVELS = ["low", "medium", "high", "critical"];
const VALID_STATUS = ["open", "closed"];
const VALID_TYPE = ["risk", "issue"];
const VALID_THREAT = ["threat", "opportunity"];

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

    // Check if creating batch or risk
    const isBatchCreation = !body.riskId; // If no riskId, it's a batch

    if (isBatchCreation) {
      // Batch creation - only requires batchId
      if (!body.batchId) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required field: batchId",
          },
          { status: 400 }
        );
      }

      const batch = await RiskService.createBatch({
        batchId: body.batchId,
        company: body.company || "",
      });

      return NextResponse.json({ success: true, batch });
    } else {
      // Risk creation - requires full risk details
      if (
        !body.riskId ||
        !body.riskName ||
        !body.category ||
        !body.level ||
        body.preProbability === undefined ||
        body.preImpact === undefined
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required fields (riskId, riskName, category, level, preProbability, preImpact)",
          },
          { status: 400 }
        );
      }

      // Validate and sanitize enums
      const level = VALID_LEVELS.includes(body.level) ? body.level : "low";
      const status = VALID_STATUS.includes(body.status) ? body.status : "open";
      const type = VALID_TYPE.includes(body.type) ? body.type : "risk";
      const threat = VALID_THREAT.includes(body.nature)
        ? body.nature
        : "threat";

      // Convert 0-100 scale to 1-5 scale (divide by 20, round, ensure min 1)
      const preProbability = Math.max(1, Math.round(body.preProbability / 20));
      const preImpact = Math.max(1, Math.round(body.preImpact / 20));
      const postProbability = Math.max(
        1,
        Math.round((body.postProbability ?? body.preProbability) / 20)
      );
      const postImpact = Math.max(
        1,
        Math.round((body.postImpact ?? body.preImpact) / 20)
      );

      // Calculate scores (1-5 scale: multiply then divide to get 1-25 range)
      const preScore = preProbability * preImpact;
      const postScore = postProbability * postImpact;

      const risk = await RiskService.createRisk({
        riskId: body.riskId,
        riskName: body.riskName,
        category: body.category,
        status,
        type,
        threat,
        level,
        preProbability,
        preImpact,
        preScore,
        costPre: body.preCost ?? 0,
        postProbability,
        postImpact,
        postScore,
        costPost: body.postCost ?? 0,
        score: body.score ?? preScore,
        description: body.description || "",
        company: body.company || "",
        batchId: body.batchId || "",
      });

      return NextResponse.json({ success: true, risk });
    }
  } catch (error) {
    console.error("Error creating registered risk/batch:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: message || "Failed to create registered risk/batch",
      },
      { status: 500 }
    );
  }
}

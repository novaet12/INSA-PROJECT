import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RiskService } from "@/lib/services/riskService";
import { v4 as uuidv4 } from "uuid";

const VALID_LEVELS = ["low", "medium", "high", "critical"] as const;
const VALID_STATUS = [
  "open",
  "closed",
  "mitigated",
  "accepted",
  "transferred",
] as const;
const VALID_TYPES = ["risk", "issue"] as const;

type Level = (typeof VALID_LEVELS)[number];
type Status = (typeof VALID_STATUS)[number];
type RiskType = (typeof VALID_TYPES)[number];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const raw = await request.json();
    const body = raw ?? {};

    // Required minimal fields
    if (!body.riskName || !body.category || !body.description) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Keep your gap rule
    if (body.gap === "No significant gap identified") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot register a risk with no significant gap",
        },
        { status: 400 }
      );
    }

    // Normalize numeric inputs: treat null/undefined/NaN as 0
    const toNumberOrZero = (v: unknown): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const preProbability = toNumberOrZero(body.preProbability);
    const preImpact = toNumberOrZero(body.preImpact);
    const preScoreRaw = body.preScore;
    const costPre = toNumberOrZero(body.costPre);

    const postProbability = toNumberOrZero(body.postProbability);
    const postImpact = toNumberOrZero(body.postImpact);
    const postScoreRaw = body.postScore;
    const costPost = toNumberOrZero(body.costPost);

    const likelihood =
      body.likelihood == null ? undefined : toNumberOrZero(body.likelihood);
    const impact =
      body.impact == null ? undefined : toNumberOrZero(body.impact);

    // Validate likelihood/impact only if provided
    if (likelihood != null && (likelihood < 1 || likelihood > 5)) {
      return NextResponse.json(
        { success: false, error: "Likelihood must be between 1 and 5" },
        { status: 400 }
      );
    }
    if (impact != null && (impact < 1 || impact > 5)) {
      return NextResponse.json(
        { success: false, error: "Impact must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Auto-calc scores if null/missing
    const preScore =
      preScoreRaw == null || preScoreRaw === ""
        ? preProbability * preImpact
        : toNumberOrZero(preScoreRaw);

    const postScore =
      postScoreRaw == null || postScoreRaw === ""
        ? postProbability * postImpact
        : toNumberOrZero(postScoreRaw);

    const scoreRaw = body.score;
    const score =
      scoreRaw == null || scoreRaw === ""
        ? preScore
        : toNumberOrZero(scoreRaw);

    // Normalize enums with safe defaults
    const level: Level = VALID_LEVELS.includes(body.level)
      ? body.level
      : "low";

    const status: Status = VALID_STATUS.includes(body.status)
      ? body.status
      : "open";

    const type: RiskType = VALID_TYPES.includes(body.type)
      ? body.type
      : "risk";

    const risk = await RiskService.createRisk({
      riskId: uuidv4(),
      riskName: body.riskName,
      category: body.category,
      status,
      type,
      threat: body.threat ?? "",
      level,
      preProbability,
      preImpact,
      preScore,
      costPre,
      postProbability,
      postImpact,
      postScore,
      costPost,
      score,
      description: body.description,
      company: body.company,
      batchId: body.batchId,
      likelihood,
      impact,
      owner: body.owner,
      gap: body.gap,
      mitigation: body.mitigation,
      impactDescription: body.impactDescription,
      questionnaireId: body.questionnaireId ?? null,
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

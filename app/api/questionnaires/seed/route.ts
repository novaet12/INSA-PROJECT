import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";

/**
 * Dev-only seeded questionnaire endpoint.
 * Usage (local/dev):
 *   POST /api/questionnaires/seed?secret=your_dev_secret
 * Set DEV_SEED_SECRET in your .env.local to protect this in shared environments.
 */
export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const secret = searchParams.get("secret") || undefined;

    const devSecret = process.env.DEV_SEED_SECRET;
    const allow = (devSecret && secret === devSecret) || process.env.NODE_ENV !== "production";

    if (!allow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const variant = searchParams.get("variant") || "default";

    let fakeData: any;

    if (variant === "physical") {
      // Physical data center security questionnaire (from user request)
      fakeData = {
        externalId: `DEV-PHYSICAL-${Date.now()}`,
        title: "Physical Security Assessment - Seed (Test)",
        responses: [
          { question: "Are all data center entry points protected by controlled access systems?", answer: "Partially Implemented" },
          { question: "Is CCTV installed to cover all critical areas and are video recordings retained as per policy?", answer: "Yes" },
          { question: "Are biometric or smart card authentication systems used for personnel access?", answer: "No" },
          { question: "Are visitor entries and exits logged, monitored and reviewed regularly?", answer: "Yes" },
        ],
        fetchedAt: new Date(),
        status: "pending",
      };
    } else {
      fakeData = {
        externalId: `DEV-SEED-${Date.now()}`,
        title: "Acme Corp - Cybersecurity Assessment (Seeded)",
        responses: [
          { question: "Company", answer: "Acme Corp" },
          { question: "Position", answer: "IT Manager" },
          { question: "Name", answer: "Jane Doe" },
          { question: "Do you use multi-factor authentication?", answer: true },
          { question: "How often do you patch systems?", answer: "Monthly" },
          { question: "Are backups tested?", answer: false },
          { question: "Do you have an incident response plan?", answer: "Yes" },
          { question: "Number of servers", answer: 24 },
        ],
        fetchedAt: new Date(),
        status: "pending",
      };
    }

    const fake = new Questionnaire(fakeData);

    const saved = await fake.save();

    // Trigger automatic analysis for the seeded questionnaire (best-effort)
    try {
      const maybeId = saved._id as unknown;
      const questionnaireId = maybeId && typeof (maybeId as { toString?: () => string }).toString === "function"
        ? (maybeId as { toString: () => string }).toString()
        : String(maybeId);
      // Fire-and-forget POST to the analysis process endpoint with cookies forwarded if present
      await fetch(`${req.nextUrl.origin}/api/analysis/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({ questionnaireId }),
      }).catch((e) => console.error("Auto-analysis trigger failed:", e));
    } catch (errTrigger) {
      console.error("Auto-analysis error:", errTrigger);
    }

    return NextResponse.json({ success: true, questionnaire: saved });
  } catch (err) {
    console.error("Seed questionnaire error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

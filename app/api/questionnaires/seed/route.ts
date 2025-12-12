import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";

// Dev-only endpoint: POST /api/questionnaires/seed?secret=your_dev_secret
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
    // optional flag to randomize the category for seeded questionnaires
    const randomFlag = (searchParams.get("random") === "true") || (searchParams.get("randomCategory") === "true");

    const categories = ["operational", "tactical", "strategic"] as const;
    const pickRandomCategory = () => categories[Math.floor(Math.random() * categories.length)];

    let fakeData: any;

    if (variant === "physical") {
      // Physical data center security questionnaire (from user request)
      fakeData = {
        externalId: `DEV-PHYSICAL-${Date.now()}`,
        title: "Physical Security Assessment - Seed (Test)",
        company: "Test Corp - Physical",
        filledBy: "John Doe",
        role: "Security Manager",
        filledDate: new Date(),
        category: searchParams.get("category") || (randomFlag ? pickRandomCategory() : "operational"),
        status: "pending",
        questions: [
          { id: 1, question: "Are all data center entry points protected by controlled access systems?", answer: "Partially Implemented", section: "Access Control", level: "operational" },
          { id: 2, question: "Is CCTV installed to cover all critical areas and are video recordings retained as per policy?", answer: "Yes", section: "Surveillance", level: "operational" },
          { id: 3, question: "Are biometric or smart card authentication systems used for personnel access?", answer: "No", section: "Authentication", level: "tactical" },
          { id: 4, question: "Are visitor entries and exits logged, monitored and reviewed regularly?", answer: "Yes", section: "Monitoring", level: "operational" },
        ]
      };
    } else {
      fakeData = {
        externalId: `DEV-SEED-${Date.now()}`,
        title: "Acme Corp - Cybersecurity Assessment (Seeded)",
        company: "Acme Corp",
        filledBy: "Jane Doe",
        role: "IT Director",
        filledDate: new Date(),
        category: searchParams.get("category") || (randomFlag ? pickRandomCategory() : "operational"),
        status: "pending",
        questions: [
          { id: 1, question: "Do you use multi-factor authentication?", answer: "Yes", section: "Access Control", level: "operational" },
          { id: 2, question: "How often do you patch systems?", answer: "Monthly", section: "Vulnerability Management", level: "operational" },
          { id: 3, question: "Are backups tested?", answer: "No", section: "Data Protection", level: "tactical" },
          { id: 4, question: "Do you have an incident response plan?", answer: "Yes", section: "Incident Response", level: "strategic" },
          { id: 5, question: "Number of servers", answer: "24", section: "Asset Management", level: "operational" },
        ]
      };
    }

    const fake = new Questionnaire(fakeData);

    const saved = await fake.save();

    return NextResponse.json({ success: true, questionnaire: saved });
  } catch (err) {
    console.error("Seed questionnaire error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

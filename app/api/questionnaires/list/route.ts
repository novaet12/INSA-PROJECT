import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const questionnaires = await Questionnaire.find().sort({ fetchedAt: -1 });

    return NextResponse.json({ success: true, questionnaires });
  } catch (error) {
    console.error("Error listing questionnaires:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || "Failed to list questionnaires" }, { status: 500 });
  }
}

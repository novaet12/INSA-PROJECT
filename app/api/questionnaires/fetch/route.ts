import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const externalApiUrl = process.env.EXTERNAL_QUESTIONNAIRE_API_URL;
    const externalApiKey = process.env.EXTERNAL_API_KEY;

    if (!externalApiUrl) {
      return NextResponse.json(
        { error: "External API URL not configured" },
        { status: 500 }
      );
    }

    // Fetch questionnaires from external API
    const headers: any = {};
    if (externalApiKey) {
      headers["Authorization"] = `Bearer ${externalApiKey}`;
    }

    const response = await axios.get(externalApiUrl, { headers });

    const questionnaires = Array.isArray(response.data)
      ? response.data
      : [response.data];

    await dbConnect();

    const savedQuestionnaires = [];

    for (const questionnaire of questionnaires) {
      // Check if questionnaire already exists
      const existing = await Questionnaire.findOne({
        externalId: questionnaire.id || questionnaire.externalId || String(questionnaire._id),
      });

      if (!existing) {
        const newQuestionnaire = new Questionnaire({
          externalId:
            questionnaire.id || questionnaire.externalId || String(questionnaire._id),
          title: questionnaire.title || "Untitled Questionnaire",
          responses:
            questionnaire.responses ||
            questionnaire.questions ||
            questionnaire.data ||
            [],
          fetchedAt: new Date(),
          status: "pending",
        });

        const saved = await newQuestionnaire.save();
        savedQuestionnaires.push(saved);

        // Trigger automatic analysis
        try {
          await fetch(`${req.nextUrl.origin}/api/analysis/process`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.get("cookie") || "",
            },
            body: JSON.stringify({ questionnaireId: saved._id.toString() }),
          });
        } catch (error) {
          console.error("Auto-analysis trigger failed:", error);
        }
      } else {
        savedQuestionnaires.push(existing);
      }
    }

    return NextResponse.json({
      success: true,
      count: savedQuestionnaires.length,
      questionnaires: savedQuestionnaires,
    });
  } catch (error: any) {
    console.error("Error fetching questionnaires:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch questionnaires" },
      { status: 500 }
    );
  }
}


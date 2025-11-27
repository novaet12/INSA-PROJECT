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

    for (const q of questionnaires) {
      // Check if questionnaire already exists by external ID
      const existing = await Questionnaire.findOne({
        externalId: q.id
      });

      if (!existing) {
        // Determine category based on which level has the most questions
        const questions = q.questions || [];
        const levelCounts = {
          operational: questions.filter((question: any) => question.level === 'operational').length,
          tactical: questions.filter((question: any) => question.level === 'tactical').length,
          strategic: questions.filter((question: any) => question.level === 'strategic').length
        };
        const category = Object.entries(levelCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

        const newQuestionnaire = new Questionnaire({
          externalId: q.id,
          title: q.title,
          company: q.company_name,
          filledBy: q.filled_by,
          role: q.role,
          filledDate: new Date(q.filled_date),
          category: category,
          status: "pending",
          questions: questions
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
            body: JSON.stringify({ questionnaireId: String(saved._id) }),
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


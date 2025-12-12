import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";
import RiskAnalysis from "@/models/RiskAnalysis";
import { performRiskAnalysis } from "@/lib/services/riskAnalyzer";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const externalApiUrl = process.env.EXTERNAL_QUESTIONNAIRE_API_URL;
    const externalApiKey = process.env.EXTERNAL_API_KEY;
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

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
    const analyzedCount = { success: 0, failed: 0, skipped: 0 };

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

        // Automatically analyze the new questionnaire
        if (openRouterApiKey && questions.length > 0) {
          try {
            console.log(`🤖 Auto-analyzing questionnaire: ${saved._id} (${saved.company})`);

            // Check if already analyzed
            const existingAnalysis = await RiskAnalysis.findOne({ questionnaireId: saved._id });
            if (!existingAnalysis) {
              const analysisResults = await performRiskAnalysis(questions, openRouterApiKey);

              const riskAnalysis = new RiskAnalysis({
                questionnaireId: saved._id,
                company: saved.company,
                category: category as 'operational' | 'tactical' | 'strategic',
                metadata: analysisResults.metadata,
                operational: analysisResults.operational,
                tactical: analysisResults.tactical,
                strategic: analysisResults.strategic,
                summary: analysisResults.summary
              });

              await riskAnalysis.save();

              // Update questionnaire status
              saved.status = 'analyzed';
              await saved.save();

              analyzedCount.success++;
              console.log(`✅ Auto-analysis completed for: ${saved.company}`);
            } else {
              analyzedCount.skipped++;
              console.log(`⏭️ Questionnaire already analyzed: ${saved.company}`);
            }
          } catch (analysisError) {
            analyzedCount.failed++;
            console.error(`❌ Auto-analysis failed for ${saved.company}:`, analysisError);
            // Don't fail the entire request if analysis fails
          }
        } else {
          analyzedCount.skipped++;
          console.log(`⏭️ Skipping analysis (no API key or no questions): ${saved.company}`);
        }
      } else {
        savedQuestionnaires.push(existing);
        analyzedCount.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      count: savedQuestionnaires.length,
      questionnaires: savedQuestionnaires,
      analysis: {
        analyzed: analyzedCount.success,
        failed: analyzedCount.failed,
        skipped: analyzedCount.skipped
      }
    });
  } catch (error: any) {
    console.error("Error fetching questionnaires:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch questionnaires" },
      { status: 500 }
    );
  }
}


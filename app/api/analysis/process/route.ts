import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";
import RiskAnalysis from "@/models/RiskAnalysis";
import RiskRegister from "@/models/RiskRegister";
import { analyzeQuestionnaire } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionnaireId } = await req.json();

    if (!questionnaireId) {
      return NextResponse.json(
        { error: "Questionnaire ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const questionnaire = await Questionnaire.findById(questionnaireId);
    if (!questionnaire) {
      return NextResponse.json(
        { error: "Questionnaire not found" },
        { status: 404 }
      );
    }

    // Check if analysis already exists
    const existingAnalysis = await RiskAnalysis.findOne({ questionnaireId });
    if (existingAnalysis) {
      return NextResponse.json({
        success: true,
        analysis: existingAnalysis,
        message: "Analysis already exists",
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Perform AI analysis
    const analysisResult = await analyzeQuestionnaire(questionnaire.responses);

    // Save analysis to MongoDB
    const riskAnalysis = new RiskAnalysis({
      questionnaireId: questionnaire._id,
      vulnerabilities: analysisResult.vulnerabilities,
      riskScore: analysisResult.riskScore,
      category: analysisResult.category,
      inherentRisk: analysisResult.inherentRisk,
      residualRisk: analysisResult.residualRisk,
      aiInsights: analysisResult.aiInsights,
      analyzedAt: new Date(),
    });

    const savedAnalysis = await riskAnalysis.save();

    // Update questionnaire status
    questionnaire.status = "analyzed";
    await questionnaire.save();

    // Automatically register risks from vulnerabilities
    try {
      const userEmail = (session.user as any)?.email || "system";
      for (const vulnerability of analysisResult.vulnerabilities) {
        const riskId = `RISK-${String(savedAnalysis._id)}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        // Check if risk already exists (avoid duplicates)
        const existingRisk = await RiskRegister.findOne({
          description: vulnerability.description,
          category: vulnerability.category,
        });

        if (!existingRisk) {
          const riskRegister = new RiskRegister({
            riskId,
            description: vulnerability.description,
            category: vulnerability.category,
            likelihood: vulnerability.likelihood,
            impact: vulnerability.impact,
            status: "open",
            mitigationStrategy: vulnerability.recommendation,
            owner: userEmail,
          });
          await riskRegister.save();
        }
      }
    } catch (error) {
      console.error("Error registering risks:", error);
      // Don't fail the entire request if risk registration fails
    }

    // Trigger automatic report generation for all levels
    try {
      const reportLevels = ["strategic", "tactical", "operational"];
      for (const level of reportLevels) {
        await fetch(`${req.nextUrl.origin}/api/reports/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: req.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            analysisId: String(savedAnalysis._id),
            level,
          }),
        });
      }
    } catch (error) {
      console.error("Auto-report generation trigger failed:", error);
    }

    return NextResponse.json({
      success: true,
      analysis: savedAnalysis,
    });
  } catch (error: any) {
    console.error("Error processing analysis:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process analysis" },
      { status: 500 }
    );
  }
}


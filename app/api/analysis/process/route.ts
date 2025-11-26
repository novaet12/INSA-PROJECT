// app/api/analysis/process/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";
import RiskAnalysis from "@/models/RiskAnalysis";
import { performRiskAnalysis } from "@/lib/services/riskAnalyzer";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionnaireId } = await request.json();

    if (!questionnaireId) {
      return NextResponse.json({
        success: false,
        error: "Questionnaire ID is required"
      }, { status: 400 });
    }

    // Check for API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "OPENROUTER_API_KEY not configured"
      }, { status: 500 });
    }

    await dbConnect();

    // Fetch questionnaire
    const questionnaire = await Questionnaire.findById(questionnaireId);
    if (!questionnaire) {
      return NextResponse.json({
        success: false,
        error: "Questionnaire not found"
      }, { status: 404 });
    }

    // Check if already analyzed
    const existingAnalysis = await RiskAnalysis.findOne({ questionnaireId });
    if (existingAnalysis) {
      return NextResponse.json({
        success: false,
        error: "This questionnaire has already been analyzed. View results in the Processed Assessments section."
      }, { status: 400 });
    }

    console.log(`🔄 Starting analysis for questionnaire: ${questionnaireId}`);
    console.log(`📋 Total questions: ${questionnaire.questions?.length || 0}`);

    if (!questionnaire.questions || questionnaire.questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No questions found in this questionnaire"
      }, { status: 400 });
    }

    // Perform risk analysis (this will take time based on question count)
    const analysisResults = await performRiskAnalysis(
      questionnaire.questions,
      apiKey
    );

    // Save to database
    const riskAnalysis = new RiskAnalysis({
      questionnaireId: questionnaire._id,
      company: questionnaire.company,
      category: questionnaire.category,
      metadata: analysisResults.metadata,
      operational: analysisResults.operational,
      tactical: analysisResults.tactical,
      strategic: analysisResults.strategic,
      summary: analysisResults.summary
    });

    await riskAnalysis.save();

    // Update questionnaire status
    questionnaire.status = 'analyzed';
    await questionnaire.save();

    console.log(`✅ Analysis completed for questionnaire: ${questionnaireId}`);

    return NextResponse.json({
      success: true,
      message: "Analysis completed successfully",
      analysisId: riskAnalysis._id.toString(),
      summary: analysisResults.summary.overall
    });

  } catch (error: any) {
    console.error("❌ Error processing analysis:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to process analysis"
    }, { status: 500 });
  }
}

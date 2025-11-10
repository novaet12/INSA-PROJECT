import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RiskAnalysis from "@/models/RiskAnalysis";
import Questionnaire from "@/models/Questionnaire";
import Report from "@/models/Report";
import RiskRegister from "@/models/RiskRegister";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const totalAnalyses = await RiskAnalysis.countDocuments();
    const totalQuestionnaires = await Questionnaire.countDocuments();
    const totalReports = await Report.countDocuments();

    const analyses = await RiskAnalysis.find().limit(10).sort({ createdAt: -1 });

    // Count risks by category from analyses
    const highRisks = await RiskAnalysis.countDocuments({ category: "High" });
    const mediumRisks = await RiskAnalysis.countDocuments({ category: "Medium" });
    const lowRisks = await RiskAnalysis.countDocuments({ category: "Low" });

    // Count risks in register
    const totalRegisteredRisks = await RiskRegister.countDocuments();
    const openRisks = await RiskRegister.countDocuments({ status: "open" });
    const mitigatedRisks = await RiskRegister.countDocuments({ status: "mitigated" });

    return NextResponse.json({
      stats: {
        totalRisks: totalAnalyses,
        highRisks,
        mediumRisks,
        lowRisks,
        totalQuestionnaires,
        totalReports,
        totalRegisteredRisks,
        openRisks,
        mitigatedRisks,
      },
      recentAnalyses: analyses,
    });
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}


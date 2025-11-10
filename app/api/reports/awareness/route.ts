import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";
import RiskAnalysis from "@/models/RiskAnalysis";
import { generateReport } from "@/lib/ai";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Find questionnaires related to awareness/assessment
    const awarenessQuestionnaires = await Questionnaire.find({
      $or: [
        { title: { $regex: /awareness/i } },
        { title: { $regex: /assessment/i } },
        { title: { $regex: /training/i } },
      ],
    }).limit(10);

    if (awarenessQuestionnaires.length === 0) {
      return NextResponse.json({
        success: true,
        report: {
          content: "No awareness assessment questionnaires found. Please fetch questionnaires related to cybersecurity awareness, training, or assessments.",
          riskMatrix: { high: 0, medium: 0, low: 0 },
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // Get analyses for awareness questionnaires
    const analyses = await RiskAnalysis.find({
      questionnaireId: { $in: awarenessQuestionnaires.map((q) => q._id) },
    });

    if (analyses.length === 0) {
      return NextResponse.json({
        success: true,
        report: {
          content: "Awareness questionnaires found but no analyses available. Please analyze the questionnaires first.",
          riskMatrix: { high: 0, medium: 0, low: 0 },
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // Aggregate awareness data
    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;
    const allVulnerabilities: any[] = [];

    analyses.forEach((analysis) => {
      analysis.vulnerabilities.forEach((vuln) => {
        allVulnerabilities.push(vuln);
        if (vuln.category === "High") totalHigh++;
        if (vuln.category === "Medium") totalMedium++;
        if (vuln.category === "Low") totalLow++;
      });
    });

    // Calculate control effectiveness
    const totalRisks = allVulnerabilities.length;
    const effectivenessScore =
      totalRisks > 0
        ? ((totalLow / totalRisks) * 100 + (totalMedium / totalRisks) * 50).toFixed(1)
        : 0;

    // Generate awareness report content
    const reportContent = `HUMAN AWARENESS ASSESSMENT REPORT

Executive Summary:
This report evaluates cybersecurity awareness capabilities based on ${awarenessQuestionnaires.length} assessment questionnaire(s) and ${analyses.length} analysis(s).

Key Findings:
- Total Risks Identified: ${totalRisks}
- High Risk Areas: ${totalHigh}
- Medium Risk Areas: ${totalMedium}
- Low Risk Areas: ${totalLow}
- Control Effectiveness Score: ${effectivenessScore}%

Awareness Capabilities Assessment:
${totalHigh > 0 ? `⚠️ ${totalHigh} critical awareness gaps identified requiring immediate attention.` : "✅ No critical awareness gaps identified."}
${totalMedium > 0 ? `⚠️ ${totalMedium} areas need improvement in cybersecurity awareness.` : ""}
${totalLow > 0 ? `✅ ${totalLow} areas demonstrate good awareness practices.` : ""}

Control Effectiveness:
The overall control effectiveness score of ${effectivenessScore}% indicates ${effectivenessScore >= 70 ? "strong" : effectivenessScore >= 50 ? "moderate" : "weak"} cybersecurity awareness posture.

Recommendations:
1. Address ${totalHigh} high-risk awareness gaps through targeted training
2. Implement awareness programs for ${totalMedium} medium-risk areas
3. Maintain and reinforce awareness in ${totalLow} low-risk areas
4. Conduct regular awareness assessments to monitor improvement
5. Provide ongoing cybersecurity training and updates

Top Awareness Gaps:
${allVulnerabilities
  .filter((v) => v.category === "High")
  .slice(0, 5)
  .map((v, i) => `${i + 1}. ${v.description}`)
  .join("\n")}

Next Steps:
- Schedule awareness training sessions
- Implement recommended controls
- Monitor awareness improvement over time
- Conduct follow-up assessments

Generated: ${new Date().toLocaleString()}`;

    return NextResponse.json({
      success: true,
      report: {
        content: reportContent,
        riskMatrix: {
          high: totalHigh,
          medium: totalMedium,
          low: totalLow,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error generating awareness report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate awareness report" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import RiskAnalysis from "@/models/RiskAnalysis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysisId, level, questionId, analysis } = body;

    if (!analysisId || !level || questionId === undefined || !analysis) {
      return NextResponse.json({ success: false, error: 'analysisId, level, questionId and analysis are required' }, { status: 400 });
    }

    await dbConnect();

    const riskAnalysis = await RiskAnalysis.findById(analysisId);
    if (!riskAnalysis) {
      return NextResponse.json({ success: false, error: 'Analysis not found' }, { status: 404 });
    }

    const bucket = (riskAnalysis as any)[level];
    if (!Array.isArray(bucket)) {
      return NextResponse.json({ success: false, error: 'Invalid level specified' }, { status: 400 });
    }

    const idx = bucket.findIndex((q: any) => q.questionId === questionId || String(q.questionId) === String(questionId));
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Question not found in analysis' }, { status: 404 });
    }

    // Update fields on the analysis subdocument
    bucket[idx].analysis = {
      ...bucket[idx].analysis,
      likelihood: Number(analysis.likelihood) || bucket[idx].analysis.likelihood,
      impact: Number(analysis.impact) || bucket[idx].analysis.impact,
      riskScore: Number(analysis.riskScore) || (Number(analysis.likelihood) || bucket[idx].analysis.likelihood) * (Number(analysis.impact) || bucket[idx].analysis.impact),
      riskLevel: analysis.riskLevel || bucket[idx].analysis.riskLevel,
      gap: analysis.gap || bucket[idx].analysis.gap,
      threat: analysis.threat || bucket[idx].analysis.threat,
      mitigation: analysis.mitigation || bucket[idx].analysis.mitigation,
    };

    // mark modified and save
    (riskAnalysis as any).markModified(level);
    await riskAnalysis.save();

    return NextResponse.json({ success: true, analysis: riskAnalysis });
  } catch (err: any) {
    console.error('Error updating analysis question:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to update' }, { status: 500 });
  }
}

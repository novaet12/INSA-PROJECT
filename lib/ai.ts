// Minimal AI helpers stub used by server routes. This file provides
// typed exports so TypeScript checks pass. In production this should
// call your real OpenAI wrapper in `lib/ai`.

export type AnalysisResult = {
  vulnerabilities: Array<any>;
  riskScore?: number;
  category?: string;
  inherentRisk?: any;
  residualRisk?: any;
  aiInsights?: any;
};

export async function analyzeQuestionnaire(responses: any[]): Promise<AnalysisResult> {
  // Lightweight stub: return empty analysis so higher-level flows work
  return {
    vulnerabilities: [],
    riskScore: 0,
    category: "",
    inherentRisk: null,
    residualRisk: null,
    aiInsights: null,
  };
}

export async function generateReport(level: string, analysisData: any): Promise<any> {
  // Lightweight stub: return a simple report structure
  return {
    content: `Report for level ${level} - no-op stub`,
    riskMatrix: { high: 0, medium: 0, low: 0 },
    charts: [],
  };
}

export default { analyzeQuestionnaire, generateReport };

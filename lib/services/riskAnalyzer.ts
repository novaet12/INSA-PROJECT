// lib/services/riskAnalyzer.ts
import { initializeAI, analyzeQuestion } from '@/lib/utils/ai';

// ============================================================
// CONFIGURATION
// ============================================================

// Note: RISK_MATRIX_CONFIG is now also in lib/utils/ai.ts for use by getRiskLevel there.
// We keep it here if needed for other functions, or we could export it from there.
// For now, I'll remove the duplicate definition if it's not used locally, 
// OR keep it if other functions below need it. 
// Looking at the code below, calculateLevelSummary uses riskLevel strings but not the config object directly.
// However, createQuestionResult uses analysis.riskMetrics which comes from ai.ts.
// Let's keep the local helpers if they are used by formatting functions, 
// but the AI part is now handled by ai.ts.

// Actually, looking at the original file, RISK_MATRIX_CONFIG was used by getRiskLevel.
// Since getRiskLevel was moved to ai.ts, we don't strictly need it here unless
// other functions use it. 
// calculateLevelSummary uses 'CRITICAL', 'HIGH' etc strings which are hardcoded keys.
// So we can probably remove the config and local calculation functions from here
// as they are now internal to ai.ts for the purpose of analysis.

// However, if we want to keep this file clean, we should just import what we need.
// The original file had calculateRiskScore and getRiskLevel used by parseAIResponse.
// Since parseAIResponse is moved, those are likely not needed here anymore.

// Let's remove the moved sections.

// ============================================================
// DATA FORMATTING FUNCTIONS
// ============================================================

const createQuestionResult = (question: any, analysis: any) => {
    return {
        questionId: question.id,
        section: question.section,
        question: question.question,
        answer: question.answer,
        level: question.level,
        analysis: {
            likelihood: analysis.likelihood,
            impact: analysis.impact,
            riskScore: analysis.riskMetrics.score,
            riskLevel: analysis.riskMetrics.level,
            riskColor: analysis.riskMetrics.color,
            gap: analysis.gap,
            threat: analysis.threat,
            mitigation: analysis.mitigation
        },
        timestamp: new Date()
    };
};

const calculateLevelSummary = (levelData: any[]) => {
    if (levelData.length === 0) {
        return {
            totalQuestions: 0,
            riskDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, VERY_LOW: 0 },
            averageRiskScore: 0,
            topRisks: []
        };
    }

    const critical = levelData.filter(d => d.analysis.riskLevel === 'CRITICAL').length;
    const high = levelData.filter(d => d.analysis.riskLevel === 'HIGH').length;
    const medium = levelData.filter(d => d.analysis.riskLevel === 'MEDIUM').length;
    const low = levelData.filter(d => d.analysis.riskLevel === 'LOW').length;
    const veryLow = levelData.filter(d => d.analysis.riskLevel === 'VERY_LOW').length;
    const avgScore = (levelData.reduce((sum, d) => sum + d.analysis.riskScore, 0) / levelData.length).toFixed(2);

    return {
        totalQuestions: levelData.length,
        riskDistribution: { CRITICAL: critical, HIGH: high, MEDIUM: medium, LOW: low, VERY_LOW: veryLow },
        averageRiskScore: parseFloat(avgScore),
        topRisks: levelData
            .sort((a, b) => b.analysis.riskScore - a.analysis.riskScore)
            .slice(0, 3)
            .map(d => ({
                questionId: d.questionId,
                riskLevel: d.analysis.riskLevel,
                riskScore: d.analysis.riskScore,
                gap: d.analysis.gap
            }))
    };
};

const calculateOverallSummary = (allData: any[]) => {
    if (allData.length === 0) {
        return {
            totalQuestionsAnalyzed: 0,
            riskDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, VERY_LOW: 0 },
            averageRiskScore: 0
        };
    }

    const allCritical = allData.filter(d => d.analysis.riskLevel === 'CRITICAL').length;
    const allHigh = allData.filter(d => d.analysis.riskLevel === 'HIGH').length;
    const allMedium = allData.filter(d => d.analysis.riskLevel === 'MEDIUM').length;
    const allLow = allData.filter(d => d.analysis.riskLevel === 'LOW').length;
    const allVeryLow = allData.filter(d => d.analysis.riskLevel === 'VERY_LOW').length;
    const overallAvg = (allData.reduce((sum, d) => sum + d.analysis.riskScore, 0) / allData.length).toFixed(2);

    return {
        totalQuestionsAnalyzed: allData.length,
        riskDistribution: {
            CRITICAL: allCritical,
            HIGH: allHigh,
            MEDIUM: allMedium,
            LOW: allLow,
            VERY_LOW: allVeryLow
        },
        averageRiskScore: parseFloat(overallAvg)
    };
};

// ============================================================
// MAIN ANALYSIS FUNCTION (EXPORTED)
// ============================================================

export const performRiskAnalysis = async (questionnaireData: any[], apiKey: string) => {
    const openai = initializeAI(apiKey);

    const results: any = {
        metadata: {
            timestamp: new Date(),
            totalQuestions: questionnaireData.length,
            levels: {
                operational: questionnaireData.filter(q => q.level === 'operational').length,
                tactical: questionnaireData.filter(q => q.level === 'tactical').length,
                strategic: questionnaireData.filter(q => q.level === 'strategic').length
            }
        },
        operational: [],
        tactical: [],
        strategic: [],
        summary: {
            operational: {},
            tactical: {},
            strategic: {},
            overall: {}
        }
    };

    // Process all levels
    for (const level of ['operational', 'tactical', 'strategic']) {
        const levelQuestions = questionnaireData.filter(q => q.level === level);

        for (let i = 0; i < levelQuestions.length; i++) {
            const question = levelQuestions[i];
            console.log(`📊 Analyzing ${level} question ${i + 1}/${levelQuestions.length}...`);

            const analysis = await analyzeQuestion(openai, question);
            const result = createQuestionResult(question, analysis);
            results[level].push(result);

            // Rate limiting to avoid API throttling
            if (i < levelQuestions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        results.summary[level] = calculateLevelSummary(results[level]);
    }

    // Calculate overall summary
    const allData = [...results.operational, ...results.tactical, ...results.strategic];
    results.summary.overall = calculateOverallSummary(allData);

    return results;
};

import { OpenRouter } from '@openrouter/sdk';

// ============================================================
// CONFIGURATION
// ============================================================

const RISK_MATRIX_CONFIG = {
    likelihoodScale: {
        1: { label: 'Remote', description: 'Very unlikely to happen' },
        2: { label: 'Low', description: 'Could happen but rare' },
        3: { label: 'Moderate', description: 'Could happen sometimes' },
        4: { label: 'High', description: 'Likely to happen' },
        5: { label: 'Almost Certain', description: 'Very likely to happen' }
    },
    impactScale: {
        1: { label: 'Minimal', description: 'Minor inconvenience' },
        2: { label: 'Low', description: 'Slight disruption' },
        3: { label: 'Moderate', description: 'Significant disruption' },
        4: { label: 'High', description: 'Severe loss' },
        5: { label: 'Critical', description: 'Catastrophic impact' }
    },
    riskLevels: {
        VERY_LOW: { range: [1, 3], color: '#10b981', label: 'Very Low', action: 'Acceptable' },
        LOW: { range: [4, 8], color: '#f59e0b', label: 'Low', action: 'Monitor' },
        MEDIUM: { range: [9, 15], color: '#f97316', label: 'Medium', action: 'Address Soon' },
        HIGH: { range: [16, 20], color: '#ef4444', label: 'High', action: 'Priority Action' },
        CRITICAL: { range: [21, 25], color: '#dc2626', label: 'Critical', action: 'Immediate Action' }
    }
};

// ============================================================
// RISK CALCULATION FUNCTIONS
// ============================================================

const calculateRiskScore = (likelihood: number, impact: number): number => {
    return likelihood * impact;
};

const getRiskLevel = (likelihood: number, impact: number) => {
    const riskScore = calculateRiskScore(likelihood, impact);
    if (riskScore >= 16) return { level: 'CRITICAL', score: riskScore, ...RISK_MATRIX_CONFIG.riskLevels.CRITICAL };
    if (riskScore >= 12) return { level: 'HIGH', score: riskScore, ...RISK_MATRIX_CONFIG.riskLevels.HIGH };
    if (riskScore >= 6) return { level: 'MEDIUM', score: riskScore, ...RISK_MATRIX_CONFIG.riskLevels.MEDIUM };
    if (riskScore >= 2) return { level: 'LOW', score: riskScore, ...RISK_MATRIX_CONFIG.riskLevels.LOW };
    return { level: 'VERY_LOW', score: riskScore, ...RISK_MATRIX_CONFIG.riskLevels.VERY_LOW };
};

// ============================================================
// AI ANALYSIS FUNCTIONS
// ============================================================

export const initializeAI = (apiKey: string) => {
    // Keep initialization minimal to avoid SDK option type mismatches
    return new OpenRouter({ apiKey });
};

const parseAIResponse = (response: string) => {
    const lines = response.split('\n').filter(line => line.trim());
    const data: any = {};

    lines.forEach(line => {
        if (line.includes('LIKELIHOOD:')) {
            const match = line.match(/LIKELIHOOD:\s*(\d)/);
            data.likelihood = match ? parseInt(match[1]) : 3;
        }
        if (line.includes('IMPACT:')) {
            const match = line.match(/IMPACT:\s*(\d)/);
            data.impact = match ? parseInt(match[1]) : 3;
        }
        if (line.includes('GAP:')) {
            data.gap = line.replace('GAP:', '').trim();
        }
        if (line.includes('THREAT:')) {
            data.threat = line.replace('THREAT:', '').trim();
        }
        if (line.includes('MITIGATION:')) {
            data.mitigation = line.replace('MITIGATION:', '').trim();
        }
    });

    data.riskMetrics = getRiskLevel(data.likelihood || 3, data.impact || 3);
    return data;
};

export const analyzeQuestion = async (openRouter: OpenRouter, question: any) => {
    const systemPrompt = `You are a cybersecurity risk analyst. For the given question and answer, provide NUMERIC risk assessment.

Format your response EXACTLY like this (NO OTHER TEXT):
LIKELIHOOD: [number 1-5]
IMPACT: [number 1-5]
GAP: [One line description]
THREAT: [One line description]
MITIGATION: [One line strategy]`;

    const userPrompt = `Analyze this security control:
Question: ${question.question}
Answer: ${question.answer}
Control Area: ${question.section}

Provide ONLY: LIKELIHOOD, IMPACT, GAP, THREAT, MITIGATION`;

    try {
        const completion = await openRouter.chat.send({
            model: 'openai/gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            stream: false,
        });

        // The SDK may return message content as a string or an array/object.
        const raw = completion?.choices?.[0]?.message?.content;
        let responseText = '';
        if (!raw) responseText = '';
        else if (typeof raw === 'string') responseText = raw;
        else if (Array.isArray(raw)) {
            responseText = raw.map((r: any) => (typeof r === 'string' ? r : r.text || '')).join('\n');
        } else if (typeof raw === 'object') {
            responseText = (raw.text || JSON.stringify(raw));
        } else {
            responseText = String(raw);
        }

        return parseAIResponse(responseText || '');
    } catch (error) {
        console.error('AI Analysis Error:', error);
        return {
            likelihood: 3,
            impact: 3,
            gap: 'Analysis error occurred',
            threat: 'Unable to analyze threat',
            mitigation: 'Manual review required',
            riskMetrics: getRiskLevel(3, 3)
        };
    }
};

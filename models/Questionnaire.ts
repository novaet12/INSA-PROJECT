// lib/models/Questionnaire.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import RiskAnalysis from '@/models/RiskAnalysis';
import { performRiskAnalysis } from '@/lib/services/riskAnalyzer';
import { acquireAnalysisLock, releaseAnalysisLock } from '@/lib/services/analysisLock';
import { broadcastEvent } from '@/lib/sseHub';

export interface IQuestion {
  id: number;
  question: string;
  answer: string;
  section: string;
  level: 'operational' | 'tactical' | 'strategic';
}

export interface IQuestionnaire extends Document {
  externalId: string;
  title: string;
  company: string;
  filledBy: string;
  role: string;
  filledDate: Date;
  category: string; // Derived from predominant question level
  status: string;
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema({
  id: { type: Number, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  section: { type: String, required: true },
  level: {
    type: String,
    enum: ['operational', 'tactical', 'strategic'],
    required: true
  }
});

const QuestionnaireSchema = new Schema<IQuestionnaire>(
  {
    externalId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    filledBy: { type: String, required: true },
    role: { type: String, required: true },
    filledDate: { type: Date, required: true },
    category: { type: String, required: true },
    status: { type: String, default: 'pending' },
    questions: [QuestionSchema]
  },
  { timestamps: true }
);

// Force recompilation of model in dev mode to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.Questionnaire) {
  delete mongoose.models.Questionnaire;
}

const Questionnaire: Model<IQuestionnaire> =
  mongoose.models.Questionnaire ||
  mongoose.model<IQuestionnaire>('Questionnaire', QuestionnaireSchema);

// Post-save hook: automatically trigger risk analysis for newly saved questionnaires
// when status is 'pending' and no existing analysis exists. This runs in the
// same process and will persist a RiskAnalysis document and update the
// questionnaire status to 'analyzed'. It is intentionally best-effort and
// will log errors without throwing to avoid disrupting the save operation.
QuestionnaireSchema.post('save', function (doc: IQuestionnaire) {
  // Run asynchronously (don't await the hook)
  (async () => {
    try {
      // Only trigger for pending questionnaires
      if (!doc || doc.status !== 'pending') return;

      // Avoid duplicate analyses
      const existing = await RiskAnalysis.findOne({ questionnaireId: doc._id });
      if (existing) return;

      // Infer category if missing
      const inferCategory = (questions?: { level?: string }[]) => {
        if (!questions || questions.length === 0) return 'operational';
        const counts: Record<'operational'|'tactical'|'strategic', number> = { operational: 0, tactical: 0, strategic: 0 };
        for (const q of questions) {
          const lvl = q?.level ? String(q.level).toLowerCase() : '';
          if (lvl === 'operational' || lvl === 'tactical' || lvl === 'strategic') counts[lvl as 'operational'|'tactical'|'strategic']++;
        }
        const sorted = (Object.entries(counts) as [string, number][]).sort((a, b) => b[1] - a[1]);
        return (sorted[0] && (sorted[0][0] as 'operational'|'tactical'|'strategic')) || 'operational';
      };

      const categoryToUse = doc.category || inferCategory(doc.questions as any);

      // Acquire analysis lock
      try {
        const lock = await acquireAnalysisLock(String(doc._id));
        if (!lock || !lock.acquired) return; // another process is analyzing
      } catch (e) {
        // If lock acquire fails, skip
        return;
      }

      try {
        // Perform analysis (uses OPENROUTER_API_KEY if available, else the dev stub)
        const apiKey = process.env.OPENROUTER_API_KEY || '';
        const analysisResults = await performRiskAnalysis(doc.questions as any, apiKey);

        // Persist RiskAnalysis
        const ra = new RiskAnalysis({
          questionnaireId: doc._id,
          company: doc.company,
          category: categoryToUse,
          metadata: analysisResults.metadata,
          operational: analysisResults.operational,
          tactical: analysisResults.tactical,
          strategic: analysisResults.strategic,
          summary: analysisResults.summary
        });

        await ra.save();

        // Broadcast over SSE hub (best-effort)
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { broadcastEvent } = require('@/lib/sseHub');
          broadcastEvent('analysis', { id: String(ra._id), company: ra.company, category: ra.category, summary: ra.summary });
        } catch (e) {}

        // Update questionnaire status
        await mongoose.model('Questionnaire').updateOne({ _id: doc._id }, { $set: { status: 'analyzed', category: categoryToUse } });
        console.log('Auto-analysis completed for questionnaire', String(doc._id));
      } finally {
        try { await releaseAnalysisLock(String(doc._id)); } catch (e) {}
      }
    } catch (err) {
      console.error('Auto-analysis failed for questionnaire:', (doc && doc._id) || '<unknown>', err);
    }
  })();
});

export default Questionnaire;

// lib/models/Questionnaire.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

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

export default Questionnaire;

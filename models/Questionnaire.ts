import mongoose, { Document, Model, Schema } from "mongoose";

export interface IQuestionnaire extends Document {
  externalId: string;
  title: string;
  responses: Array<{
    question: string;
    answer: string | number | boolean;
    category?: string;
  }>;
  fetchedAt: Date;
  status: "pending" | "analyzed" | "error";
  createdAt: Date;
  updatedAt: Date;
}

const QuestionnaireSchema: Schema<IQuestionnaire> = new Schema(
  {
    externalId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    responses: [
      {
        question: { type: String, required: true },
        answer: { type: Schema.Types.Mixed, required: true },
        category: { type: String },
      },
    ],
    fetchedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "analyzed", "error"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Questionnaire: Model<IQuestionnaire> =
  mongoose.models.Questionnaire ||
  mongoose.model<IQuestionnaire>("Questionnaire", QuestionnaireSchema);

export default Questionnaire;


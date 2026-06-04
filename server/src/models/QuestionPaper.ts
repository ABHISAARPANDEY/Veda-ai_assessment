import { Schema, model, type InferSchemaType, type Model, Types } from "mongoose";

const QuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    marks: { type: Number, required: true },
    type: { type: String, required: true },
    answer: { type: String, default: "" },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const SectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    instruction: { type: String, default: "" },
    questions: { type: [QuestionSchema], default: [] },
  },
  { _id: false }
);

const QuestionPaperSchema = new Schema(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    sections: { type: [SectionSchema], default: [] },
    status: { type: String, enum: ["completed", "failed"], required: true },
    error: { type: String },
  },
  { timestamps: true }
);

export type QuestionPaperDoc = InferSchemaType<typeof QuestionPaperSchema> & {
  _id: Types.ObjectId;
};
export const QuestionPaper: Model<QuestionPaperDoc> = model<QuestionPaperDoc>(
  "QuestionPaper",
  QuestionPaperSchema
);

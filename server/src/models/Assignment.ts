import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const QuestionBreakdownItemSchema = new Schema(
  {
    type: { type: String, required: true },        // backend key: "mcq", "short", "diagram", "numerical", "long"
    typeLabel: { type: String, required: true },   // user-facing: "Multiple Choice Questions"
    count: { type: Number, required: true, min: 1 },
    marksPerQuestion: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const AssignmentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    dueDate: { type: Date },
    questionTypes: { type: [String], required: true, default: [] },
    questionBreakdown: { type: [QuestionBreakdownItemSchema], default: [] },
    numQuestions: { type: Number, required: true, min: 1 },
    totalMarks: { type: Number, required: true, min: 1 },
    instructions: { type: String, default: "" },
    sourceText: { type: String },
    classLevel: { type: String, default: "" },
    subject: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export type AssignmentDoc = InferSchemaType<typeof AssignmentSchema> & { _id: unknown };
export const Assignment: Model<AssignmentDoc> = model<AssignmentDoc>(
  "Assignment",
  AssignmentSchema
);

import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const AssignmentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    dueDate: { type: Date },
    questionTypes: { type: [String], required: true, default: [] },
    numQuestions: { type: Number, required: true, min: 1 },
    totalMarks: { type: Number, required: true, min: 1 },
    instructions: { type: String, default: "" },
    sourceText: { type: String },
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

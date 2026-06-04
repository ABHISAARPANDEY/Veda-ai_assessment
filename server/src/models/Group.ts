import { Schema, model, type InferSchemaType, type Model, Types } from "mongoose";

const StudentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNo: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const GroupSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    classLevel: { type: String, default: "" },
    students: { type: [StudentSchema], default: [] },
  },
  { timestamps: true }
);

export type GroupDoc = InferSchemaType<typeof GroupSchema> & { _id: Types.ObjectId };
export const Group: Model<GroupDoc> = model<GroupDoc>("Group", GroupSchema);

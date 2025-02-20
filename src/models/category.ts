import { Schema, model, Document } from "mongoose";

export interface ICategory extends Document {
  value: string;
}

const categorySchema = new Schema<ICategory>(
  {
    value: { type: String, required: true },
  },
  { timestamps: true }
);

export const Category = model<ICategory>("Category", categorySchema);

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const tokenSchema = new Schema(
  {
    label: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    icon: { type: String, required: true },
    proportion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Token = model("token", tokenSchema);

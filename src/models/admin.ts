import mongoose from "mongoose";

const { Schema, model } = mongoose;

const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

export const Admin = model("Admin", adminSchema);


import { Schema, model, Document, models } from "mongoose";

export interface IUser extends Document {
  walletAddress: string;
  username?: string;
  profileImage?: string;
  name?: string;
}

const userSchema = new Schema<IUser>(
  {
    walletAddress: { type: String, required: true, unique: true },
    username: { type: String },
    profileImage: { type: String },
    name: { type: String },
  },
  { timestamps: true }
);
export const User = model<IUser>("User", userSchema);

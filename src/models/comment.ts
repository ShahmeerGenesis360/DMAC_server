import { Schema, model, Document, Types, models } from "mongoose";

export interface IComment extends Document {
  // username: string;
  message: string;
  isBullish: boolean;
  indexId: Types.ObjectId;
  userId: Types.ObjectId;
  like?: number;
  dislike?: number;
  lastImpressionAt?: Date;
  impressions?: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    message: { type: String, required: true },
    isBullish: { type: Boolean, required: true },
    indexId: { type: Schema.Types.ObjectId, ref: "GroupCoin", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    like: { type: Number, default: 0 },
    dislike: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    lastImpressionAt: { type: Date, default: new Date("1990-01-01") },
  },
  { timestamps: true }
);

export const Comment = model<IComment>("Comment", commentSchema);

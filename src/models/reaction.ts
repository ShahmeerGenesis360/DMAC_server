import { Schema, model, Document, Types, models } from "mongoose";

export interface IReaction extends Document {
  chatId: Types.ObjectId;
  indexId: Types.ObjectId;
  userId: Types.ObjectId;
  reaction: "LIKE" | "DISLIKE" | "NONE";
}

const reactionSchema = new Schema<IReaction>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    indexId: { type: Schema.Types.ObjectId, ref: "GroupCoin", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reaction: {
      type: String,
      enum: ["LIKE", "DISLIKE", "NONE"],
      default: "NONE",
    },
  },
  { timestamps: true }
);

export const Reaction = model<IReaction>("Reaction", reactionSchema);

import { Schema, model, Document, Types, models } from 'mongoose';

export interface IComment extends Document {
  username: string;
  message: string;
  isBullish: boolean;
  indexId: Types.ObjectId;
  userId: Types.ObjectId;
}

const commentSchema = new Schema<IComment>(
  {
    username: { type: String, required: true },
    message: { type: String, required: true },
    isBullish: { type: Boolean, required: true },
    indexId: { type: Schema.Types.ObjectId, ref: 'GroupCoin', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Comment = model<IComment>("Comment", commentSchema);
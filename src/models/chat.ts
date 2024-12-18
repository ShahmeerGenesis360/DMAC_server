import { Schema, model, Document, Types, models } from 'mongoose';

export interface IChat extends Document {
  username: string;
  message: string;
  isBullish: boolean;
  indexId: Types.ObjectId;
  userId: Types.ObjectId;
}

const chatSchema = new Schema<IChat>(
  {
    username: { type: String, required: true },
    message: { type: String, required: true },
    isBullish: { type: Boolean, required: true },
    indexId: { type: Schema.Types.ObjectId, ref: 'GroupCoin', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Chat = model<IChat>("Chat", chatSchema);
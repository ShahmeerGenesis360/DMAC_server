import { Schema, model, Document, models } from 'mongoose';

export interface IGroupCoin extends Document {
  name: string;
  coins: Array<string>;
  imageUrl?: string;
  visitCount: number;
}

const groupCoinSchema = new Schema<IGroupCoin>(
  {
    name: { type: String, required: true },
    coins: { type: [String], required: true },
    imageUrl: { type: String },
    visitCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const GroupCoin = model<IGroupCoin>("GroupCoin", groupCoinSchema);
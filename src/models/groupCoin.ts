import { Schema, model, Document } from "mongoose";

// Define the ICoin interface
export interface ICoin extends Document {
  coinName: string;
  address: string;
}

// Define the IGroupCoin interface
export interface IGroupCoin extends Document {
  name: string;
  coins: Array<ICoin>;
  imageUrl?: string;
  visitCount: number;
}

// Define the ICoin schema
const coinSchema = new Schema<ICoin>(
  {
    coinName: { type: String, required: true },
    address: { type: String, required: true },
  },
  { _id: false } // Prevent Mongoose from creating a separate _id for each subdocument
);

// Define the IGroupCoin schema
const groupCoinSchema = new Schema<IGroupCoin>(
  {
    name: { type: String, required: true },
    coins: { type: [coinSchema], required: true }, // Use the coinSchema here
    imageUrl: { type: String },
    visitCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const GroupCoin = model<IGroupCoin>("GroupCoin", groupCoinSchema);

import { Schema, model, Document, models } from "mongoose";
import { GroupCoin } from "./groupCoin";

export interface IRecord extends Document {
  user: string; // User who made the transaction
  type: "deposit" | "withdrawal"; // Type of transaction (deposit or withdrawal)
  indexCoin: typeof GroupCoin;
  amount: number; // The amount deposited or withdrawn
  tokenAddress: string;
  timestamp?: number; // Optional custom timestamp for transaction
}

const recordSchema = new Schema<IRecord>(
  {
    // user: { type: String, required: true },
    type: { type: String, enum: ["deposit", "withdrawal"], required: true }, // Enum for transaction type
    indexCoin: { type: Schema.Types.ObjectId, ref: "GroupCoin", required: true },
    amount: { type: Number, required: true }, // Either deposit or withdrawal amount
    tokenAddress: { type: String},
    timestamp: { type: Number, default: Date.now }, // Optional, defaults to current time
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

export const Record = model<IRecord>(
  "Record",
  recordSchema
);

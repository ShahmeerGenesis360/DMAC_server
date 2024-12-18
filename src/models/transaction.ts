import { Schema, model, Document, models } from "mongoose";

export interface ITransaction extends Document {
  user: string; // User who made the transaction
  indexConfig: string; // Associated index configuration
  type: "deposit" | "withdrawal"; // Type of transaction (deposit or withdrawal)
  amount: number; // The amount deposited or withdrawn
  tokens: number; // Tokens minted or burned
  timestamp?: number; // Optional custom timestamp for transaction
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: { type: String, required: true },
    indexConfig: { type: String, required: true },
    type: { type: String, enum: ["deposit", "withdrawal"], required: true }, // Enum for transaction type
    amount: { type: Number, required: true }, // Either deposit or withdrawal amount
    tokens: { type: Number, required: true }, // Tokens minted (for deposit) or burned (for withdrawal)
    timestamp: { type: Number, default: Date.now }, // Optional, defaults to current time
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

export const Transaction = model<ITransaction>(
  "Transaction",
  transactionSchema
);

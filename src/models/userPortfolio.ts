import { Schema, model, Document, Types, models } from "mongoose";

export interface IUserPortfolio extends Document {
  userId: Types.ObjectId; // Reference to the User model
  indexId: Types.ObjectId; // Reference to the GroupCoin model
  type: "PROFIT" | "LOSE"; // Enum for profit or loss type
  amount: number; // Amount representing profit or loss
}

const userPortfolioSchema = new Schema<IUserPortfolio>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    indexId: { type: Schema.Types.ObjectId, ref: "GroupCoin", required: true },
    type: { type: String, enum: ["PROFIT", "LOSE"], required: true }, // Enum for type
    amount: { type: Number, required: true }, // Amount field
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

export const UserPortfolio = model<IUserPortfolio>(
  "UserPortfolio",
  userPortfolioSchema
);

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const adminRewardSchema = new Schema(
  {
    adminAddress: { type: String, required: true },
    amount: { type: Number, required: true },
    indexCoin: { type: Schema.Types.ObjectId, ref: "GroupCoin", required: true },
  },
  { timestamps: true }
);

export const AdminReward = model("AdminReward", adminRewardSchema);

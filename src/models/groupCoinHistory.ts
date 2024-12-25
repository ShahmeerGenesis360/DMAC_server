import { Schema, model, Types } from "mongoose";

export interface IGroupCoinHistory {
  price: string;
  time: string;
  indexId: Types.ObjectId;
}

export const groupCoinHistorySchema = new Schema<IGroupCoinHistory>(
  {
    price: { type: String, required: true },
    time: { type: String, required: true },
    indexId: {
      type: Schema.Types.ObjectId,
      ref: "GroupCoin",
      required: true,
    },
  },
  { timestamps: true }
);

export const GroupCoinHistory = model<IGroupCoinHistory>(
  "GroupCoinHistory",
  groupCoinHistorySchema
);

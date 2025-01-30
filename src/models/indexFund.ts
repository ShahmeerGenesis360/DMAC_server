import { model, Schema } from "mongoose";

const indexFundSchema = new Schema({
  totalSupply: { type: Number, default: 0 },
  indexWorth: { type: Number, default: 0 },
  indexId: {
    type: Schema.Types.ObjectId,
    ref: "GroupCoin",
    required: true,
  },
});

export const IndexFund = model("IndexFund", indexFundSchema);

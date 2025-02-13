import { Schema, model, Types } from "mongoose";

export interface IPriceGraph {
    price: number;
    time: string;
    indexId: Types.ObjectId;
    createdAt: Date;
  }
const PriceGraphSchema = new Schema<IPriceGraph>(
    {
        price: {type: Number, required: false, default:0},
        time: { type: String, required: true },
      indexId: {
        type: Schema.Types.ObjectId,
        ref: "GroupCoin",
        required: true,
      },
    },
    { timestamps: true }
  );

export const Price = model<IPriceGraph>("Price", PriceGraphSchema);
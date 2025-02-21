import { Schema, model, Types } from "mongoose";

export interface ILiquidityLocked {
    liquidity: number;
    time: string;
    createdAt: Date;
}

export const liquidityLocked = new Schema<ILiquidityLocked>(
    {
      liquidity: { type: Number, required: true },
      time: { type: String, required: true },
    },
    { timestamps: true }
  );
  
export const LiquidityLocked = model<ILiquidityLocked>(
    "LiquidityLocked",
    liquidityLocked
);
  
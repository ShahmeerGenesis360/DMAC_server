import { Schema, model, Document } from "mongoose";

// Define the ICoin interface
export interface ICoin extends Document {
  coinName: string;
  address: string;
  proportion: number;
  amount: number;
}

export interface IFaq extends Document {
  question: string;
  answer: string;
}

export interface ICollectorDetail extends Document {
  collector: string;
  weight: Number;
}

// Define the IGroupCoin interface
export interface IGroupCoin extends Document {
  name: string;
  coins: Array<ICoin>;
  imageUrl?: string;
  visitCount: number;
  description: string;
  faq: Array<IFaq>;
  mintKeySecret: string;
  mintPublickey: string;
  collectorDetail: Array<ICollectorDetail>;
  feeAmount: string;
  category: string;
  symbol: string;
  holders: number;
  supply: number;
  marketCap: number;
  price: number;
}

// Define the ICoin schema
const coinSchema = new Schema<ICoin>(
  {
    proportion: { type: Number, required: true },
    coinName: { type: String, required: true },
    address: { type: String, required: true },
    amount: { type: Number, default: 0 ,required: false },
  },
  { _id: false } // Prevent Mongoose from creating a separate _id for each subdocument
);

const faqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false } // Prevent Mongoose from creating a separate _id for each subdocument
);

const collectorDetailSchema = new Schema<ICollectorDetail>(
  {
    collector: { type: String },
    weight: { type: Number },
  },
  { _id: false } // Prevent Mongoose from creating a separate _id for each subdocument
);

// Define the IGroupCoin schema
const groupCoinSchema = new Schema<IGroupCoin>(
  {
    name: { type: String, required: true },
    coins: { type: [coinSchema], required: true }, // Use the coinSchema here
    imageUrl: { type: String },
    description: { type: String, required: true },
    visitCount: { type: Number, default: 0 },
    faq: { type: [faqSchema], required: true },
    mintKeySecret: { type: String, required: true },
    mintPublickey: { type: String, required: true },
    collectorDetail: { type: [collectorDetailSchema] },
    feeAmount: { type: String, required: true },
    category: { type: String, required: true },
    symbol: { type: String },
    holders: {type:Number, required:false, default: 0},
    supply: {type: Number, required: false, default: 0},
    marketCap: {type: Number, required: false, default: 0},
    price: {type: Number, required: false, default:0}
  },
  { timestamps: true }
);

export const GroupCoin = model<IGroupCoin>("GroupCoin", groupCoinSchema);

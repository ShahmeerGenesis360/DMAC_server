import dotenv from "dotenv";
import * as anchor from '@coral-xyz/anchor';
import bs58 from 'bs58';
dotenv.config();
  
export const PROGRAM_ID = process.env.PROGRAM_ID;
export const NETWORK = process.env.NETWORK;
export const POSTGRES_URI = process.env.POSTGRES_URI;
export const RPC_URL = process.env.RPC_URL;

const privateKey = process.env.PRIVATE_KEY as string;
const getKeypair: anchor.web3.Keypair = anchor.web3.Keypair.fromSecretKey(bs58.decode(privateKey));
export const REDIS_URI = process.env.REDIS_URL;
export const config = {
  port: process.env.PORT || 5000,
  mongo_uri: process.env.MONGO_URI || "",
  PROGRAM_ID: process.env.PROGRAM_ID,
  NETWORK: process.env.NETWORK,
  POSTGRES_URI:process.env.POSTGRES_URI,
  RPC_URL: process.env.RPC_URL,
  getKeypair: getKeypair,
  redisHost: process.env.REDIS_HOST || 'localhost', // Use the host provided by the cloud Redis service
  redisPort: Number(process.env.REDIS_PORT) || 6379, // Use the port provided by the cloud Redis service
  redisPassword: process.env.REDIS_PASSWORD || undefined,  // Optional, only if Redis is password protected
  redisDb: Number(process.env.REDIS_DB) || 0,
  PRIVATE_KEY: process.env.PRIVATE_KEY
};

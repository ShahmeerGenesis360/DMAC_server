import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import * as anchor from "@coral-xyz/anchor";

interface BaseEvent {
  slot: number;
  signature: string;
  timestamp: number;
}
export interface PaginatedResponse<T> {
  meta: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
  };
  data: T[];
}

export interface DmacBuyIndexEvent extends BaseEvent{
  index_mint: string;
  deposited: string;
  minted: string;
  adminFee: string;
  // userAddress: string;
}

export interface DmacSellIndexEvent extends BaseEvent{
  index_mint: string;
  withdrawn: string;
  burned: string;
  adminFee: string;
  // userAddress: string;
}

export type SwapResult = {
  // tx1: VersionedTransaction;
  transaction1: VersionedTransaction;
  instructions: anchor.web3.TransactionInstruction[]
};
import { PublicKey, VersionedTransaction } from '@solana/web3.js';

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
}

export interface DmacSellIndexEvent extends BaseEvent{
  index_mint: string;
  withdrawn: string;
  burned: string;
}

export type SwapResult = {
  tx1: VersionedTransaction;
  tx2: VersionedTransaction;
};
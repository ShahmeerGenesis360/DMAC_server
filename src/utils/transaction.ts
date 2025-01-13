import * as anchor from "@coral-xyz/anchor";
import { 
    Connection, 
    PublicKey, 
    SystemProgram, 
    TransactionMessage, 
    VersionedTransaction,
    SendTransactionError,
    Keypair,
} from '@solana/web3.js';


const MAX_TRANSACTION_SIZE = 1232;

interface TokenSwapInfo {
  id: string;
  amount: number;
  emoji?: string;
}
interface SwapResult {
    signature: string;
    status: 'success' | 'error';
    error?: string;
}
  
interface TransactionBatch {
    transactions: VersionedTransaction[];
}

const createTransactionBatches = async (transactions: VersionedTransaction[] ): Promise<TransactionBatch[]> => {
    try{
        let batches: TransactionBatch[];
        let currentBatch: TransactionBatch = { transactions: [] };
        let currentBatchSize = 0;
        for(let i = 0;i<transactions.length;i++){
            const transaction = transactions[i]
            const transactionSize = transaction.serialize().length;
            if(currentBatchSize+transactionSize > MAX_TRANSACTION_SIZE && currentBatch.transactions.length > 0){
                batches.push(currentBatch);
                currentBatch = { transactions: [] };
                currentBatchSize = 0;
            }
            currentBatch.transactions.push(transaction);
            currentBatchSize += transactionSize;
        }
        if (currentBatch.transactions.length > 0) {
            batches.push(currentBatch);
        }

        return batches;
    }catch(error){
        throw new Error(error)
    }
}

const processTransactionBatch = async (batch: TransactionBatch, adminKeypair: Keypair, provider: anchor.Provider): Promise<SwapResult[]> => {

    const results: SwapResult[] = [];
    
    // Sign all transactions in the batch
    const signedTransactions: VersionedTransaction[] = [];
    for(const tx of batch.transactions){
        tx.sign([adminKeypair]);
        signedTransactions.push(tx);
    }
    
    // Process each signed transaction
    for (let i = 0; i < signedTransactions.length; i++) {
      try {
        const signature = await provider.send(
          signedTransactions[i],
          [adminKeypair],
          {
            skipPreflight: false,
            maxRetries: 2,
            preflightCommitment: 'confirmed'
          }
        );

        // Wait for confirmation with additional verification
        const confirmed = await provider.connection.confirmTransaction(signature, "confirmed");

        results.push({
          signature,
          status: confirmed ? 'success' : 'error',
          error: confirmed ? undefined : 'Transaction failed to confirm'
        });
        return results;
      } catch (err) {
        console.error(`Erron in transaction of batch:`, err);
        results.push({
          signature: '',
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error occurred'
        });
      }
    }
}

const executeBulkSwap = async (batches:TransactionBatch[], adminKeypair: Keypair, provider: anchor.Provider) => {
   try{
    let allResults: SwapResult[] = [];
    for (let i = 0; i < batches.length; i++) {
        const batchResults = await processTransactionBatch(batches[i], adminKeypair, provider);
        allResults = [...allResults, ...batchResults]; // Update results after each batch
    }
    const failedSwaps = allResults.filter(r => r.status === 'error');
    if (failedSwaps.length > 0) {
        throw new Error("Error in batch transfer")
    }

    return allResults;
   }catch(error){
    console.error('Bulk swap error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bulk swap failed';
    throw new Error(errorMessage)
   }
}

export {createTransactionBatches, executeBulkSwap}
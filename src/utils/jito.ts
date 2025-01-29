import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { config } from "../config/index";
import { searcher, bundle } from "jito-ts";
import { SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";


const { BLOCK_ENGINE_URL, RPC_URL, BUNDLE_TRANSACTION_LIMIT } = config;

// Limit the number of concurrent connections (streams) to the searcher
const MAX_CONCURRENT_CONNECTIONS = 3; // Set a limit for concurrent connections
let activeConnections = 0;

// Queue to hold the bundle result subscriptions
const connectionQueue: (() => Promise<void>)[] = [];

export const getRandomeTipAccountAddress = async (
  searcherClient: searcher.SearcherClient
) => {
  const account = await searcherClient.getTipAccounts();
  if (!account || account.length === 0) {
    throw new Error("No tip accounts available.");
  }
  return new PublicKey(account[0]);
};

// Function to wait for an available connection slot
const waitForAvailableConnectionSlot = async () => {
  while (activeConnections >= MAX_CONCURRENT_CONNECTIONS) {
    console.log('Waiting for available connection slot...');
    // Wait a bit before retrying
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay of 1 second before retrying
  }
};

const processBundleResults = async (searcherClient: searcher.SearcherClient) => {
  await waitForAvailableConnectionSlot();

  const connectionPromise = new Promise<void>((resolve, reject) => {
    activeConnections++;

    // Subscribe to the bundle result
    searcherClient.onBundleResult(
      (result) => {
        console.log("Received bundle result:", result);
        resolve();
      },
      (e) => {
        console.error("Error receiving bundle result:", e);
        reject(e);
      }
    );
  });

  // Add the connection promise to the queue
  connectionQueue.push(() => connectionPromise);

  // Ensure that the active connection count is decreased when done
  connectionPromise.finally(() => {
    activeConnections--;
  });
};

export async function bundleAndSend(keypair: Keypair, transactions: VersionedTransaction[], provider: anchor.Provider) {
  const blockEngineUrl = BLOCK_ENGINE_URL || "";
  console.log("BLOCK_ENGINE_URL:", blockEngineUrl);

  const bundleTransactionLimit = parseInt(BUNDLE_TRANSACTION_LIMIT || "4", 10);
  console.log(BUNDLE_TRANSACTION_LIMIT, "bundle limit")
  const searcherClient = searcher.searcherClient(blockEngineUrl);

  // Process bundle results with throttling
  await processBundleResults(searcherClient);

  // const tipAccount = await getRandomeTipAccountAddress(searcherClient);
  // console.log("Tip account:", tipAccount);

  const connection = new Connection(RPC_URL, "confirmed");
  // console.log(connection)
  // const blockHash = await connection.getLatestBlockhash();


  // const tipIx = SystemProgram.transfer({
  //   fromPubkey: keypair.publicKey,
  //   toPubkey: tipAccount,
  //   lamports: 100000,
  // });
  // console.log(tipIx, "tipIx")

  // const blockHash = await provider.connection.getLatestBlockhash()
  // console.log(blockHash)
  // console.log(await connection.getBalance(keypair.publicKey), "balance")
  
  
  // const tipTx = new VersionedTransaction(
  //   new TransactionMessage({
  //     payerKey: keypair.publicKey,
  //     recentBlockhash: blockHash.blockhash,
  //     instructions: [tipIx],
  //   }).compileToV0Message()
  // );
  // tipTx.sign([keypair]);
  // console.log(tipTx, "tiptx")
  console.log("before bundle")
  const jitoBundle = new bundle.Bundle(
    [...transactions],
    bundleTransactionLimit
  );

  console.log(jitoBundle, "jitoBundle");

  try {
    const resp = await searcherClient.sendBundle(jitoBundle);
    console.log("Response:", resp);
  } catch (e) {
    if (e.message.includes("RESOURCE_EXHAUSTED")) {
      console.error("Resource exhausted. Retrying...");
      // Retry logic can be added here
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Retry after 5 seconds
      await bundleAndSend(keypair, transactions, provider); // Retry sending the bundle
    } else {
      console.error("Error sending bundle:", e);
    }
  }
}

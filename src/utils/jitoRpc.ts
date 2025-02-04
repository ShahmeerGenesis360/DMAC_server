import axios from "axios";
import { PublicKey, SystemProgram, Transaction, VersionedTransaction, Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { RPC_URL } from "../config";

// Set up connection to the Solana network
const connection = new Connection(RPC_URL);

// Define interfaces for function parameters where necessary
interface JitoBundleResponse {
  bundleId: string;
  status: string;
  landedSlot: number;
}

interface GetTipAccountsResponse {
  result: string[];
  error?: { message: string };
}

async function getTipAccounts(): Promise<string[]> {
  try {
    const response = await axios.post<GetTipAccountsResponse>(
      "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getTipAccounts",
        params: [],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.result;
  } catch (error) {
    console.error("❌ Error getting tip accounts:", error.message);
    throw error;
  }
}

async function createJitoBundle(transactions: Transaction[] | VersionedTransaction[], wallet: Keypair): Promise<string[]> {
  try {
    const tipAccounts = await getTipAccounts();
    if (!tipAccounts || tipAccounts.length === 0) {
      throw new Error("❌ Failed to get Jito tip accounts");
    }

    const tipAccountPubkey = new PublicKey(
      tipAccounts[Math.floor(Math.random() * tipAccounts.length)]
    );

    const tipInstruction = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: tipAccountPubkey,
      lamports: 100000,
    });

    const latestBlockhash = await connection.getLatestBlockhash("finalized");

    const tipTransaction = new Transaction().add(tipInstruction);
    tipTransaction.recentBlockhash = latestBlockhash.blockhash;
    tipTransaction.feePayer = wallet.publicKey;
    tipTransaction.sign(wallet);

    console.log("🔄 Encoding transactions...");
    const bundle = [tipTransaction, ...transactions].map((tx, index) => {
      console.log(`📦 Encoding transaction ${index + 1}`);
      if (tx instanceof VersionedTransaction) {
        console.log(`🔢 Transaction ${index + 1} is VersionedTransaction`);
        return bs58.encode(tx.serialize());
      } else {
        console.log(`📜 Transaction ${index + 1} is regular Transaction`);
        return bs58.encode(tx.serialize({ verifySignatures: false }));
      }
    });

    console.log("✅ Bundle created successfully");
    return bundle;
  } catch (error) {
    console.error("❌ Error in createJitoBundle:", error);
    console.error("🔍 Error stack:", error.stack);
    throw error;
  }
}

async function sendJitoBundle(bundle: string[]): Promise<any> {
  try {
    const response = await axios.post(
      "https://mainnet.block-engine.jito.wtf:443/api/v1/bundles",
      {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [bundle],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    console.log(response.data)
    return response.data.result;
  } catch (error) {
    console.error("❌ Error sending Jito bundle:", error.message);
    throw error;
  }
}

async function checkBundleStatus(bundleId: string): Promise<JitoBundleResponse | null> {
  try {
    const response = await axios.post(
      "https://mainnet.block-engine.jito.wtf/api/v1/getInflightBundleStatuses",
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getInflightBundleStatuses",
        params: [[bundleId]],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log(response.data)

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    console.log(response.data.result.value[0])
    const result = response.data.result.value[0];
    if (!result) {
      console.log(`ℹ️ No status found for bundle ID: ${bundleId}`);
      return null;
    }

    return {
      bundleId: result.bundle_id,
      status: result.status,
      landedSlot: result.landed_slot,
    };
  } catch (error) {
    console.error("❌ Error checking bundle status:", error.message);
    return null;
  }
}

export { createJitoBundle, sendJitoBundle, checkBundleStatus };

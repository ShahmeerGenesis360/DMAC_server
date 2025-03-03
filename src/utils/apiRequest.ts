import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GroupCoin } from "../models/groupCoin";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  Connection,
  VersionedTransaction,
  MessageV0,
  TransactionMessage,
  TransactionInstruction,
} from "@solana/web3.js";
import { searcher, bundle } from "jito-ts";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  createSyncNativeInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {getRandomeTipAccountAddress} from '../utils/jito'

import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

import bs58 from "bs58";
// const bs58 = require('bs58');
import dotenv from "dotenv";
import {
  findProgramWSOLAccount,
  getQuote,
  getResult,
  getSwapIx,
  processJsonFile,
  setResult,
  swapToSolana,
  swapToToken,
  rebalanceIndexTokens,
} from "./web3";
import * as borsh from "@coral-xyz/borsh";
import { Provider } from "@project-serum/anchor";
// import { collect } from "./test";

// import {
//   configAddress,
//   cpSwapProgram,
//   createPoolFeeReceive
// } from "./config";
// import {
//   getAuthAddress,
//   getOrcleAccountAddress,
//   getPoolAddress,
//   getPoolLpMintAddress,
//   getPoolVaultAddress
// } from "./pda";



dotenv.config();

const filePath = "./result.json";


const indexInfoSchema = borsh.struct([
  // 📌 Skip `indexTokens` and `feeCollectors`
  
  borsh.f64("totalValue"),        // 8 bytes
  borsh.f64("totalSupply"),       // 8 bytes

  // 📌 Read the name length first
  borsh.u32("nameLength"),        // 4 bytes
  borsh.str("name"),           // Variable-length

  borsh.u8("status"),             // 1 byte
  borsh.i64("lastRebalanceTs"),   // 8 bytes
  borsh.u64("solToSwap"),         // 8 bytes
  borsh.u64("solToSwapFee"),      // 8 bytes
  borsh.u8("bump"),               // 1 byte
]);

async function updateCoinAmount(groupCoinId: string, coinAddress: string, amount: number) {
  await GroupCoin.updateOne(
    { _id: groupCoinId, "coins.address": coinAddress }, // Find the document where the coin exists
    { $inc: { "coins.$.amount": amount } } // Increment the `amount` field of the matched coin
  );
}


function getAdminKeypair() {
  const adminPrivateKey = process.env.PRIVATE_KEY as string;
  return anchor.web3.Keypair.fromSecretKey(bs58.decode(adminPrivateKey));
}

function getProgramId() {
  return new anchor.web3.PublicKey(
    process.env.PROGRAM_ID as string
  );
}

function getProgramState() {
  const programId = getProgramId();
  const [programState] = PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("index")],
    programId
  );

  return programState;
}

function getIndexInfoPda(indexMint: PublicKey) {
  const programId = getProgramId();
  const [indexInfoPdaAccount] = PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("index_info"), indexMint.toBuffer()],
    programId
  );

  return indexInfoPdaAccount;
}

const getIndexInfoPDA = (indexMint: PublicKey, programId: PublicKey): PublicKey => {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("index_info"),  // ✅ Matches the seed used on-chain
      indexMint.toBuffer()        // ✅ Uses the index mint's public key
    ],
    programId
  );
  return pda;
};

export const fetchIndexInfo = async (connection: Connection, indexMint: PublicKey, programId: PublicKey) => {
  try {
    const pda = getIndexInfoPDA(indexMint, programId);
    console.log("Derived PDA:", pda.toBase58());

    const accountInfo = await connection.getAccountInfo(pda);
    if (!accountInfo) {
      console.error("❌ Account not found");
      return null;
    }

    // 🔍 Log raw data for debugging
    console.log("🔹 Raw Account Data (Hex):", accountInfo.data.toString("hex").slice(0, 100));
    console.log("🔹 Raw Account Data Length:", accountInfo.data.length);

    // 🛠 Decode only the required fields
    let decodedData = indexInfoSchema.decode(accountInfo.data);

    console.log("✅ Decoded IndexInfo:", decodedData);
    return decodedData;
  } catch (error) {
    console.error("❌ Error fetching IndexInfo:", error);
    return null;
  }
};




// export const fetchIndexInfo = async (connection: Connection, indexMint: PublicKey) => {
//   try {
//     const pda = getIndexInfoPda(indexMint);
//     console.log("Derived PDA:", pda.toBase58());

//     // Fetch account info
//     const accountInfo = await connection.getAccountInfo(pda);
//     console.log(accountInfo, "accountInfo")

   

//     if (!accountInfo) {
//       console.error("Account not found");
//       return null;
//     }

//     // Deserialize the account data

//     const decodedData = indexInfoSchema.decode(accountInfo.data);
    
//     console.log("Decoded IndexInfo:", decodedData);

//     return decodedData;
//   } catch (error) {
//     console.error("Error fetching IndexInfo:", error);
//     return null;
//   }
// };

function getSwapToTknInfoPda(indexMint: PublicKey) {
  const programId = getProgramId();
  const [indexInfoPdaAccount] = PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("swap_to_tkn"), indexMint.toBuffer()],
    programId
  );

  return indexInfoPdaAccount;
}

function getSwapToSolInfoPda(indexMint: PublicKey, userPublicKey: PublicKey) {
  const programId = getProgramId();
  const [indexInfoPdaAccount] = PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("swap_to_sol"),
      indexMint.toBuffer(),
      userPublicKey.toBuffer(),
    ],
    programId
  );

  return indexInfoPdaAccount;
}

const SYSTEM_PROGRAM_ID = anchor.web3.SystemProgram.programId;
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
const PYTH_NETWORK_PROGRAM_ID = new PublicKey(
  "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
);

const adminKeypair = getAdminKeypair();
const adminPublicKey = adminKeypair.publicKey;

const programState = getProgramState();

export async function initialize(
  program: Program,
  platformFeePercentage: number
) {
  const accounts = {
    programState: programState,
    admin: adminPublicKey,
    systemProgram: SYSTEM_PROGRAM_ID,
  };
  // console.log("accounts: ", accounts);

  let txHash = await program.rpc.initialize(
    adminPublicKey,
    new anchor.BN(platformFeePercentage * 100),
    {
      accounts: accounts,
      signers: [adminKeypair],
    }
  );

  return txHash;
}

export async function createIndex(program: Program, provider: anchor.Provider, mintKeypair: Keypair) {
  const mintPublicKey = mintKeypair.publicKey;
  
  // const adminTokenAccount = (await getOrCreateAssociatedTokenAccount(
  //   provider.connection,
  //   adminKeypair,
  //   mintPublicKey,
  //   adminPublicKey,
  //   false
  // )).address;
  const adminTokenAccount = getAssociatedTokenAddressSync(
    mintPublicKey,
    adminPublicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const accounts = {
    programState: programState,
    admin: adminPublicKey,
    indexInfo: getIndexInfoPda(mintPublicKey),
    authority: mintPublicKey,
    indexMint: mintPublicKey,
    adminTokenAccount: adminTokenAccount,
    priceUpdate: PYTH_NETWORK_PROGRAM_ID,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    systemProgram: SYSTEM_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  };
  // console.log("accounts: ", accounts);

  const percentage = 625;

  let txHash = await program.rpc.createIndex(
    "index",
    "description",
    [
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
      {
        mint: mintPublicKey,
        weight: new anchor.BN(percentage)
      },
    ],
    new anchor.BN(1 * LAMPORTS_PER_SOL),
    {
      accounts: accounts,
      signers: [mintKeypair, adminKeypair],
    }
  );

  return txHash;
}

export async function buyIndex(
  program: Program,
  mintKeypair: Keypair,
  userKeypair: Keypair,
  amount_in_sol: number
) {
  const mintPublicKey = mintKeypair.publicKey;
  const userPublicKey = userKeypair.publicKey;

  const userTokenAccount = getAssociatedTokenAddressSync(
    mintPublicKey,
    userPublicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const accounts = {
    programState: programState,
    user: userPublicKey,
    indexInfo: getIndexInfoPda(mintPublicKey),
    authority: mintPublicKey,
    indexMint: mintPublicKey,
    userTokenAccount: userTokenAccount,
    admin: adminPublicKey,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    systemProgram: SYSTEM_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    priceUpdate: PYTH_NETWORK_PROGRAM_ID,
  };
  // console.log("accounts: ", accounts);

  let txHash = await program.rpc.buyIndex(
    new anchor.BN(amount_in_sol * LAMPORTS_PER_SOL),
    {
      accounts: accounts,
      signers: [mintKeypair, userKeypair],
    }
  );

  return txHash;
}

// export async function swapToTknStart(program: Program, mintKeypair: Keypair, provider: anchor.Provider, keypair:Keypair) {
//   const mintPublicKey = mintKeypair.publicKey;
//   const getIndexInfo = getIndexInfoPda(mintPublicKey)
//   console.log(getIndexInfo)
  
//   const accounts = {
//     programState: programState,
//     admin: adminPublicKey,
//     indexMint: mintPublicKey,
//     indexInfo: getIndexInfo,
//     swapToTknInfo: getSwapToTknInfoPda(mintPublicKey),
//     systemProgram: SYSTEM_PROGRAM_ID,
//   };
//   // console.log("accounts: ", accounts);

// //   let txHash = await program.rpc.swapToTknStart({
// //     accounts: accounts,
// //     signers: [adminKeypair],
// //   });
//     const transaction = program.transaction.swapToTknStart({
//         accounts: accounts,
//         signers: [adminKeypair],
//     });
//     const blockhash = await provider.connection.getLatestBlockhash();
//     const messageV0 = new TransactionMessage({
//     payerKey: adminPublicKey,
//     recentBlockhash: blockhash.blockhash,
//     instructions: transaction.instructions, // Use the instructions from the program RPC
//     }).compileToV0Message();

// // Convert the message into a VersionedTransaction
//     const versionedTransaction = new VersionedTransaction(messageV0);
//     versionedTransaction.sign([keypair])

    
//     const blockEngineUrl = "mainnet.block-engine.jito.wtf";
//   console.log("BLOCK_ENGINE_URL:", blockEngineUrl);

//   const bundleTransactionLimit = parseInt("5", 10);
//   console.log(5, "bundle limit")
//   const searcherClient = searcher.searcherClient(blockEngineUrl);
//   const tipAccount = await getRandomeTipAccountAddress(searcherClient)
//   const tipIx = SystemProgram.transfer({
//     fromPubkey: keypair.publicKey,
//     toPubkey: tipAccount,
//     lamports: 100000,
//   });
//   const tipTx = new VersionedTransaction(
//     new TransactionMessage({
//       payerKey: keypair.publicKey,
//       recentBlockhash: blockhash.blockhash,
//       instructions: [tipIx],
//     }).compileToV0Message()
//   );
//   tipTx.sign([keypair])
//   const swapToTokenStartIns = transaction.instructions;
//   return { versionedTransaction, swapToTokenStartIns };
// }

export async function swapToTknStart(
  program: Program,
  mintKeypair: Keypair,
  provider: anchor.Provider
  // keypair: Keypair
) {
  try{
    const mintPublicKey = mintKeypair.publicKey;

    const accounts = {
      programState: programState,
      admin: adminPublicKey,
      indexMint: mintPublicKey,
      indexInfo: getIndexInfoPda(mintPublicKey),
      swapToTknInfo: getSwapToTknInfoPda(mintPublicKey),
      systemProgram: SYSTEM_PROGRAM_ID,
    };
    // console.log("accounts: ", accounts);

    let txHash = await program.rpc.swapToTknStart({
      accounts: accounts,
      signers: [adminKeypair],
    });
    console.log(txHash, "txnHash")
    const confirmation = await provider.connection.confirmTransaction(txHash,"finalized")
    
    if (confirmation.value.err) {
      console.error(`Transaction failed: ${txHash}`)
      return null
    } else {
      console.log(`Transaction confirmed: ${txHash}`);
      return txHash; // Exit the retry loop if successful
    }

  }catch(err){
    console.log("swap to token start failed: ",err)
    return null
  }
  
}


export async function createWsol(
  program: anchor.Program,
  mintKeypair: Keypair,
  keypair: Keypair,
  provider: anchor.AnchorProvider
) {
  try {
    const mintPublicKey = mintKeypair.publicKey;

    const wsolTokenAccount = getAssociatedTokenAddressSync(
      SOL_MINT,
      adminPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const accounts = {
      programState: programState,
      admin: adminPublicKey,
      indexMint: mintPublicKey,
      swapToTknInfo: getSwapToTknInfoPda(mintPublicKey),
      wsolMint: SOL_MINT,
      wsolTokenAccount: wsolTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    console.log("Creating wSOL with accounts:", accounts);

    // ✅ Create transaction
    const transaction = await program.methods.createWsol().accounts(accounts).transaction();

    // ✅ Sign transaction with admin keypair
    transaction.feePayer = provider.wallet.publicKey;
    transaction.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    await transaction.sign(keypair);

    // ✅ Send transaction
    const signature = await provider.connection.sendTransaction(transaction, [keypair], {
      skipPreflight: false, // Ensure preflight checks
      preflightCommitment: "finalized",
    });

    console.log(`✅ Transaction confirmed with signature: ${signature}`);
    return signature;
  } catch (err) {
    console.error("❌ Error in createWsol:", err);
    return null;
  }
}



export async function getTokenProgramId(
  connection: Connection,
  tokenPublicKey: PublicKey
): Promise<PublicKey> {
  const accountInfo = await connection.getAccountInfo(tokenPublicKey);

  if (!accountInfo) {
    throw new Error("Token account not found.");
  }

  if (accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
    return TOKEN_PROGRAM_ID;
  } else if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID;
  } else {
    throw new Error("Unknown token program for the provided account.");
  }
}

// export async function swapToTkn(
//   program: Program,
//   provider: anchor.Provider,
//   mintKeypair: Keypair,
//   tokenPublicKey: PublicKey,
//   amountInSol: number,
//   keypair: Keypair,
// ): Promise<SwapResult> {
//   const mintPublicKey = mintKeypair.publicKey;

//   const SOL = new PublicKey("So11111111111111111111111111111111111111112");

//   let result: any = null;

//     // Find the best Quote from the Jupiter API
//     const quote = await getQuote(SOL, tokenPublicKey, amountInSol);
//     console.log(quote, "quote")
//     const tokenProgramId = await getTokenProgramId(
//       provider.connection,
//       tokenPublicKey
//     );
//     // Convert the Quote into a Swap instruction
//     const tokenAccount = getAssociatedTokenAddressSync(
//       tokenPublicKey,
//       adminPublicKey,
//       false,
//       tokenProgramId
//     );

//     console.log(tokenAccount,tokenPublicKey, tokenProgramId, adminKeypair.publicKey.toString(),"tokenAccount")
//     result = await getSwapIx(adminPublicKey, tokenAccount, quote);

//     if ("error" in result) {
//       console.log({ result });
//       return result;
//   }
//   // We have now both the instruction and the lookup table addresses.
//   const {
//     computeBudgetInstructions, // The necessary instructions to setup the compute budget.
//     swapInstruction, // The actual swap instruction.
//     addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
//   } = result;

//   // const associatedTokenAddress = await getOrCreateAssociatedTokenAccount(
//   //   provider.connection,
//   //   adminKeypair,
//   //     SOL,
//   //     adminPublicKey,
//   //     false
//   //   );
    
    
//     // const syncNativeIx = createSyncNativeInstruction(associatedTokenAddress.address);
//     // const { blockhash } = await provider.connection.getLatestBlockhash("confirmed");
   
//     // const messageV0 = new TransactionMessage({
//     //     payerKey: adminPublicKey,
//     //     recentBlockhash: blockhash,
//     //     instructions: [syncNativeIx],  // Directly use TransactionInstruction (no need for VersionedInstruction)
//     //   }).compileToV0Message();
//     // const tx1 = new VersionedTransaction(messageV0)
   

//     const {transaction1, instructions} = await swapToToken(
//         program,
//         provider,
//         adminKeypair,
//         programState,
//         mintPublicKey,
//         getIndexInfoPda(mintPublicKey),
//         getSwapToTknInfoPda(mintPublicKey),
//         computeBudgetInstructions,
//         swapInstruction,
//         addressLookupTableAddresses,
//         keypair,
//     );

//     return {transaction1, instructions};
// }

export async function swapToTkn(
  program: Program,
  provider: anchor.Provider,
  mintKeypair: Keypair,
  tokenPublicKey: PublicKey,
  amountInSol: number,
  // groupCoinId: string,
  // coinAddress: string,
  // keypair: Keypair
): Promise<string> {
  try{
    const mintPublicKey = mintKeypair.publicKey;

  const SOL = new PublicKey("So11111111111111111111111111111111111111112");

  let result = null;
  const tokenProgramId = await getTokenProgramId(
    provider.connection,
    tokenPublicKey
  );

  const quote = await getQuote(SOL, tokenPublicKey, amountInSol);
  const tokenAccount = (
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      adminKeypair,
      tokenPublicKey,
      adminPublicKey,
      false, // allowOwnerOffCurve
      "confirmed", // commitment
      null, // confirmOptions
      tokenProgramId // The correct token program ID
    )
  ).address;
  result = await getSwapIx(adminPublicKey, tokenAccount, quote);

  if ("error" in result) {
    console.log({ result }, "error in getSwapIx");
    return null
  }
  // We have now both the instruction and the lookup table addresses.
  const {
    computeBudgetInstructions, // The necessary instructions to setup the compute budget.
    swapInstruction, // The actual swap instruction.
    addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
  } = result;

  const txHash = await swapToToken(
    program,
    provider,
    tokenPublicKey,
    adminKeypair,
    programState,
    mintPublicKey,
    getIndexInfoPda(mintPublicKey),
    getSwapToTknInfoPda(mintPublicKey),
    computeBudgetInstructions,
    swapInstruction,
    addressLookupTableAddresses
  );

  return txHash;
  // await updateCoinAmount(groupCoinId, coinAddress, quote.outAmount);
  }catch(err){
    console.log(err)
    return null
  }
  
}

// export async function swapToTknEnd(program: Program, mintKeypair: Keypair, provider: anchor.Provider, keypair: Keypair, collectorPublicKeys: PublicKey[]) {
//   const mintPublicKey = mintKeypair.publicKey;

//   const accounts = {
//     programState: programState,
//     admin: adminPublicKey,
//     indexMint: mintPublicKey,
//     indexInfo: getIndexInfoPda(mintPublicKey),
//     swapToTknInfo: getSwapToTknInfoPda(mintPublicKey),
//     systemProgram: SYSTEM_PROGRAM_ID,
//   };
//   // console.log("accounts: ", accounts);
//   const remainingAccounts = collectorPublicKeys.map((pubkey) => ({
//     pubkey,
//     isSigner: false,
//     isWritable: true,
//   }));
//   let transaction = await program.transaction.swapToTknEnd({
//     accounts: accounts,
//     remainingAccounts: remainingAccounts,
//     signers: [adminKeypair],
//   });
//   const blockhash = await provider.connection.getLatestBlockhash();
//     const messageV0 = new TransactionMessage({
//     payerKey: adminPublicKey,
//     recentBlockhash: blockhash.blockhash,
//     instructions: transaction.instructions, // Use the instructions from the program RPC
//     }).compileToV0Message();

// // Convert the message into a VersionedTransaction
//   const versionedTransaction3 = new VersionedTransaction(messageV0);
//   versionedTransaction3.sign([keypair])

//   return {versionedTransaction3};
// }

export async function swapToTknEnd(
  program: Program,
  provider: anchor.Provider,
  mintKeypair: Keypair,
  collectorPublicKeys: PublicKey[]
) {
  try{
    const mintPublicKey = mintKeypair.publicKey;

    const accounts = {
      programState: programState,
      admin: adminPublicKey,
      indexMint: mintPublicKey,
      indexInfo: getIndexInfoPda(mintPublicKey),
      swapToTknInfo: getSwapToTknInfoPda(mintPublicKey),
      systemProgram: SYSTEM_PROGRAM_ID,
      // programAuthorityPda: programAuthorityPda,
    };
    // console.log("accounts: ", accounts);
    const remainingAccounts = collectorPublicKeys.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));

    let txHash = await program.rpc.swapToTknEnd({
      accounts: accounts,
      remainingAccounts: remainingAccounts,
      signers: [adminKeypair],
    });

    const confirmation = await provider.connection.confirmTransaction(txHash,"finalized")
    
    if (confirmation.value.err) {
      console.error(`Transaction failed: ${txHash}`);
      txHash = null
    } else {
      console.log(`Transaction confirmed: ${txHash}`);
      return txHash; // Exit the retry loop if successful
    }

    // Return instructions (no transactions created or signed here)
    return txHash

  }catch(err){
    console.error(err);
    return null
  }
  
}

export async function swapToSol(
  program: Program,
  provider: anchor.Provider,
  mintKeypair: Keypair,
  userPublicKey: PublicKey,
  tokenPublicKey: PublicKey,
  amountInToken: number
) {
  try{
    const mintPublicKey = mintKeypair.publicKey;

    const SOL = new PublicKey("So11111111111111111111111111111111111111112");

    let result = null;

    const quote = await getQuote(tokenPublicKey, SOL, amountInToken);

    // Convert the Quote into a Swap instruction
    const programWSOLAccount = findProgramWSOLAccount(program.programId);
    result = await getSwapIx(adminPublicKey, programWSOLAccount, quote);

    if ("error" in result) {
      console.log({ result });
      return result;
    }
    const {
      computeBudgetInstructions, // The necessary instructions to setup the compute budget.
      swapInstruction, // The actual swap instruction.
      addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
    } = result;
  
    const txHash = await swapToSolana(
      program,
      provider,
      tokenPublicKey,
      adminKeypair,
      programState,
      mintPublicKey,
      getIndexInfoPda(mintPublicKey),
      getSwapToSolInfoPda(mintPublicKey, userPublicKey),
      userPublicKey,
      computeBudgetInstructions,
      swapInstruction,
      addressLookupTableAddresses,
      amountInToken
    );
  
    return txHash;
  }catch(err){
    console.log("erron in swapToSol", JSON.stringify(err))
    return null
  }
  
}

export async function sellIndex(
  program: Program,
  mintKeypair: Keypair,
  userKeypair: Keypair,
  amount_in_index: number
) {
  const mintPublicKey = mintKeypair.publicKey;
  const userPublicKey = userKeypair.publicKey;

  const userTokenAccount = getAssociatedTokenAddressSync(
    mintPublicKey,
    userPublicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const accounts = {
    programState: programState,
    user: userPublicKey,
    indexInfo: getIndexInfoPda(mintPublicKey),
    swapToSolInfo: getSwapToSolInfoPda(mintPublicKey, userPublicKey),
    authority: mintPublicKey,
    indexMint: mintPublicKey,
    userTokenAccount: userTokenAccount,
    admin: adminPublicKey,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    systemProgram: SYSTEM_PROGRAM_ID,
    priceUpdate: PYTH_NETWORK_PROGRAM_ID,
  };
  // console.log("accounts: ", accounts);

  let txHash = await program.rpc.sellIndex(
    // new anchor.BN(amount_in_index * LAMPORTS_PER_SOL),
    new anchor.BN(amount_in_index),
    {
      accounts: accounts,
      signers: [mintKeypair, userKeypair],
    }
  );

  return txHash;
}

// export async function swapToSolEnd(
//   program: Program, 
//   mintKeypair: Keypair, 
//   userPublicKey: PublicKey,
//   provider: anchor.Provider,
//   collectorPublicKeys: PublicKey[]
//   ) {
//   const mintPublicKey = mintKeypair.publicKey;

//   const accounts = {
//     programState: programState,
//     admin: adminPublicKey,
//     indexMint: mintPublicKey,
//     indexInfo: getIndexInfoPda(mintPublicKey),
//     swapToSolInfo: getSwapToSolInfoPda(mintPublicKey, userPublicKey),
//     userAccount: userPublicKey,
//     systemProgram: SYSTEM_PROGRAM_ID,
//   };
//   // console.log("accounts: ", accounts);

//   const remainingAccounts = collectorPublicKeys.map((pubkey) => ({
//     pubkey,
//     isSigner: false,
//     isWritable: true,
//   }));

//   // let transaction = await program.transaction.swapToSolEnd({
//   //   accounts: accounts,
//   //   remainingAccounts: remainingAccounts,
//   //   signers: [adminKeypair],
//   // });

//   let swapToSolEndInstruction = await program.methods
//   .swapToSolEnd()
//   .accounts(accounts)
//   .remainingAccounts(remainingAccounts)
//   .instruction();;

//   return {
//     instructions: [swapToSolEndInstruction],
//   };
// //   const blockhash = await provider.connection.getLatestBlockhash();
// //   const messageV0 = new TransactionMessage({
// //     payerKey: adminPublicKey,
// //     recentBlockhash: blockhash.blockhash,
// //     instructions: transaction.instructions, // Use the instructions from the program RPC
// //     }).compileToV0Message();

// // // Convert the message into a VersionedTransaction
// //     const versionedTransaction = new VersionedTransaction(messageV0);
  
// //   return versionedTransaction;
// }

export async function swapToSolEnd(
  program: Program,
  mintKeypair: Keypair,
  userPublicKey: PublicKey,
  provider: anchor.Provider,
  collectorPublicKeys: PublicKey[]
): Promise< string> {
  try {
  const mintPublicKey = mintKeypair.publicKey;

  const accounts = {
    programState: programState,
    admin: adminPublicKey,
    indexMint: mintPublicKey,
    indexInfo: getIndexInfoPda(mintPublicKey),
    swapToSolInfo: getSwapToSolInfoPda(mintPublicKey, userPublicKey),
    userAccount: userPublicKey,
    systemProgram: SYSTEM_PROGRAM_ID,
  };
  // console.log("accounts: ", accounts);
  const remainingAccounts = collectorPublicKeys.map((pubkey) => ({
    pubkey,
    isSigner: false,
    isWritable: true,
  }));

  let txID = await program.rpc.swapToSolEnd({
    accounts: accounts,
    remainingAccounts: remainingAccounts,
    signers: [adminKeypair],
  });

  const confirmation = await provider.connection.confirmTransaction(txID,"finalized")
  
  if (confirmation.value.err) {
    console.error(`Transaction failed: ${txID}`);
    return null
  } else {
    console.log(`Transaction confirmed: ${txID}`);
    return txID; // Exit the retry loop if successful
  }

  } catch (error) {
    console.error("Error generating swapToSolEnd instruction:", error);
    return null
  }
}


export async function rebalanceIndexStart(
  program: Program,
  mintKeypair: Keypair,
  weights: any,
  provider: anchor.Provider,
) {
  try{
    const mintPublicKey = mintKeypair.publicKey;
    console.log(getRebalanceIndexInfoPda(mintPublicKey), "rebalance index pda address" )
    const accounts = {
      programState: programState,
      admin: adminPublicKey,
      indexMint: mintPublicKey,
      indexInfo: getIndexInfoPda(mintPublicKey),
      rebalanceInfo: getRebalanceIndexInfoPda(mintPublicKey),
      systemProgram: SYSTEM_PROGRAM_ID,
    };
    // console.log("accounts: ", accounts);
  
    let txHash = await program.rpc.rebalanceIndexStart(weights, {
      accounts: accounts,
      signers: [adminKeypair],
    });

    const confirmation = await provider.connection.confirmTransaction(txHash,"finalized")
    
    if (confirmation.value.err) {
      console.error(`Transaction failed: ${txHash}`)
      return null
    } else {
      console.log(`Transaction confirmed: ${txHash}`);
      return txHash; // Exit the retry loop if successful
    }

  }catch(err){
    console.log(JSON.stringify(err))
    return null;
  }
 
}

export async function rebalanceIndex(
  program: Program,
  provider: anchor.Provider,
  mintKeypair: Keypair,
  tokenPublicKey: PublicKey,
  buy: boolean,
  amount: number
) {
  try{

    const mintPublicKey = mintKeypair.publicKey;

    const SOL = new PublicKey("So11111111111111111111111111111111111111112");

    let result = null;


      let quote = null;
      let tokenAccount = null;
      if(buy) {
        // Find the best Quote from the Jupiter API
        quote = await getQuote(SOL, tokenPublicKey, amount);

        // Convert the Quote into a Swap instruction
        tokenAccount = getAssociatedTokenAddressSync(
          tokenPublicKey,
          adminPublicKey,
          false,
          TOKEN_PROGRAM_ID
        );
      } else {
        // Find the best Quote from the Jupiter API
        quote = await getQuote(tokenPublicKey, SOL, amount);
        console.log(quote, "quote")
        // Convert the Quote into a Swap instruction
        tokenAccount = getAssociatedTokenAddressSync(
          SOL,
          adminPublicKey,
          false,
          TOKEN_PROGRAM_ID
        );
      }
      console.log(tokenAccount, "tokenAccount")
      result = await getSwapIx(adminPublicKey, tokenAccount, quote);
      if ("error" in result) {
        console.log({ result });
        return null;
      }
    

    // We have now both the instruction and the lookup table addresses.
    const {
      computeBudgetInstructions, // The necessary instructions to setup the compute budget.
      swapInstruction, // The actual swap instruction.
      addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
    } = result;

    if (buy) {
      const associatedTokenAddress = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        adminKeypair,
        SOL,
        adminPublicKey,
        false
      );
      const transaction1 = new Transaction();
      transaction1.add(
        SystemProgram.transfer({
          fromPubkey: adminKeypair.publicKey, // Sender (authority) account
          toPubkey: associatedTokenAddress.address, // Recipient account
          lamports: amount, // Amount in lamports
        })
      );
      // Sign and send the transaction
      const txHash1 = await sendAndConfirmTransaction(
        provider.connection,
        transaction1,
        [adminKeypair]
      );
      const syncNativeIx = createSyncNativeInstruction(
        associatedTokenAddress.address
      );
      const { blockhash } = await provider.connection.getLatestBlockhash(
        "confirmed"
      );
      // Create a transaction to transfer SOL and sync the native account
      const transaction = new Transaction().add(syncNativeIx);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = adminPublicKey;
      // Sign and send the transaction
      const signature = await sendAndConfirmTransaction(
        provider.connection,
        transaction,
        [adminKeypair]
      );
    }

    const txHash = await rebalanceIndexTokens(
      program,
      provider,
      tokenPublicKey,
      adminKeypair,
      programState,
      mintPublicKey,
      getIndexInfoPda(mintPublicKey),
      getRebalanceIndexInfoPda(mintPublicKey),
      computeBudgetInstructions,
      swapInstruction,
      addressLookupTableAddresses,
      amount
    );

    return txHash;

  }catch(err){
    console.log(err)
    return null
  }
  
}

export async function rebalanceIndexEnd(
  program: Program,
  mintKeypair: Keypair
) {
  const mintPublicKey = mintKeypair.publicKey;

  const accounts = {
    programState: programState,
    admin: adminPublicKey,
    indexMint: mintPublicKey,
    indexInfo: getIndexInfoPda(mintPublicKey),
    rebalanceInfo: getRebalanceIndexInfoPda(mintPublicKey),
    systemProgram: SYSTEM_PROGRAM_ID,
  };
  // console.log("accounts: ", accounts);

  let txHash = await program.rpc.rebalanceIndexEnd({
    accounts: accounts,
    signers: [adminKeypair],
  });

  return txHash;
}


async function createAndGetTokenAccount(
  program: Program,
  publicKey: anchor.web3.PublicKey,
  tokenMint: anchor.web3.PublicKey,
  tokenProgramId: anchor.web3.PublicKey
) {
  const tokenList = await program.provider.connection.getTokenAccountsByOwner(
    publicKey,
    { mint: tokenMint, programId: tokenProgramId }
  );

  let tokenAccount = null;
  if (tokenList.value.length > 0) {
    tokenAccount = tokenList.value[0].pubkey;
  } else {
    // Create associated token accounts for the new accounts
    tokenAccount = await createAssociatedTokenAccount(
      program.provider.connection,
      adminKeypair,
      tokenMint,
      publicKey,
      undefined,
      tokenProgramId
    );
  }
  return tokenAccount;
}

function getRebalanceIndexInfoPda(indexMint: PublicKey) {
  const programId = getProgramId();
  const [rebalanceIndexInfoPdaAccount] = PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("rebalance"), indexMint.toBuffer()],
    programId
  );

  return rebalanceIndexInfoPdaAccount;
}

async function airdrop(connection: Connection, publicKey: PublicKey, amount: number) {
  const signature = await connection.requestAirdrop(
    publicKey,
    amount * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(signature);
}
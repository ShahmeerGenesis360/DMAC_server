import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {SwapResult} from "../types/index"
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
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  createSyncNativeInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

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
} from "./web3";
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

export async function swapToTknStart(program: Program, mintKeypair: Keypair, provider: anchor.Provider) {
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

//   let txHash = await program.rpc.swapToTknStart({
//     accounts: accounts,
//     signers: [adminKeypair],
//   });
    const transaction = program.transaction.swapToTknStart({
        accounts: accounts,
        signers: [adminKeypair],
    });
    const blockhash = await provider.connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
    payerKey: adminPublicKey,
    recentBlockhash: blockhash.blockhash,
    instructions: transaction.instructions, // Use the instructions from the program RPC
    }).compileToV0Message();

// Convert the message into a VersionedTransaction
    const versionedTransaction = new VersionedTransaction(messageV0);


    return versionedTransaction;
}

export async function swapToTkn(
  program: Program,
  provider: anchor.Provider,
  mintKeypair: Keypair,
  tokenPublicKey: PublicKey,
  amountInSol: number
): Promise<SwapResult> {
  const mintPublicKey = mintKeypair.publicKey;

  const SOL = new PublicKey("So11111111111111111111111111111111111111112");

  let result: any = null;

    // Find the best Quote from the Jupiter API
    const quote = await getQuote(SOL, tokenPublicKey, amountInSol);

    // Convert the Quote into a Swap instruction
    const tokenAccount = getAssociatedTokenAddressSync(
      tokenPublicKey,
      adminPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    result = await getSwapIx(adminPublicKey, tokenAccount, quote);

    if ("error" in result) {
      console.log({ result });
      return result;
  }
  // We have now both the instruction and the lookup table addresses.
  const {
    computeBudgetInstructions, // The necessary instructions to setup the compute budget.
    swapInstruction, // The actual swap instruction.
    addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
  } = result;

  const associatedTokenAddress = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    adminKeypair,
      SOL,
      adminPublicKey,
      false
    );
    
    // console.log("associatedTokenAddress", associatedTokenAddress);
    // await airdrop(provider.connection, associatedTokenAddress.address, 1);
    const syncNativeIx = createSyncNativeInstruction(associatedTokenAddress.address);
    const { blockhash } = await provider.connection.getLatestBlockhash("confirmed");
    // Create a transaction to transfer SOL and sync the native account
    const messageV0 = new TransactionMessage({
        payerKey: adminPublicKey,
        recentBlockhash: blockhash,
        instructions: [syncNativeIx],  // Directly use TransactionInstruction (no need for VersionedInstruction)
      }).compileToV0Message();
    const tx1 = new VersionedTransaction(messageV0)
    // const tx1 = await provider.sendAndConfirm(versionedSyncNativeTransaction, [adminKeypair]);
    // const transaction = new Transaction().add(syncNativeIx);
    // transaction.recentBlockhash = blockhash;
    // transaction.feePayer = adminPublicKey;
    // Sign and send the transaction
    // const signature = await sendAndConfirmTransaction(provider.connection, transaction, [
    //   adminKeypair,
    // ]);

    const tx2 = await swapToToken(
        program,
        provider,
        adminKeypair,
        programState,
        mintPublicKey,
        getIndexInfoPda(mintPublicKey),
        getSwapToTknInfoPda(mintPublicKey),
        computeBudgetInstructions,
        swapInstruction,
        addressLookupTableAddresses
    );

    return {tx1, tx2};
}

export async function swapToTknEnd(program: Program, mintKeypair: Keypair, provider: anchor.Provider) {
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

  let transaction = await program.transaction.swapToTknEnd({
    accounts: accounts,
    signers: [adminKeypair],
  });
  const blockhash = await provider.connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
    payerKey: adminPublicKey,
    recentBlockhash: blockhash.blockhash,
    instructions: transaction.instructions, // Use the instructions from the program RPC
    }).compileToV0Message();

// Convert the message into a VersionedTransaction
    const versionedTransaction = new VersionedTransaction(messageV0);

  return versionedTransaction;
}

export async function swapToSol(
  program: Program,
  provider: anchor.Provider,
  mintKeypair: Keypair,
  userPublicKey: PublicKey,
  tokenPublicKey: PublicKey,
  amountInToken: number
) {
  const mintPublicKey = mintKeypair.publicKey;

  const SOL = new PublicKey("So11111111111111111111111111111111111111112");

  let result: any = null;
    // Find the best Quote from the Jupiter API
    const quote = await getQuote(tokenPublicKey, SOL, amountInToken);

    // Convert the Quote into a Swap instruction
    const programWSOLAccount = findProgramWSOLAccount(program.programId);
    result = await getSwapIx(adminPublicKey, programWSOLAccount, quote);

    if ("error" in result) {
      console.log({ result });
      return result;
    }

  // We have now both the instruction and the lookup table addresses.
  const {
    computeBudgetInstructions, // The necessary instructions to setup the compute budget.
    swapInstruction, // The actual swap instruction.
    addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
  } = result;

  const txn = await swapToSolana(
    program,
    provider,
    adminKeypair,
    programState,
    mintPublicKey,
    getIndexInfoPda(mintPublicKey),
    getSwapToSolInfoPda(mintPublicKey, userPublicKey),
    userPublicKey,
    computeBudgetInstructions,
    swapInstruction,
    addressLookupTableAddresses
  );

  return txn;
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

export async function swapToSolEnd(
  program: Program, 
  mintKeypair: Keypair, 
  userPublicKey: PublicKey,
  provider: anchor.Provider) {
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

  let transaction = await program.transaction.swapToSolEnd({
    accounts: accounts,
    signers: [adminKeypair],
  });
  const blockhash = await provider.connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: adminPublicKey,
    recentBlockhash: blockhash.blockhash,
    instructions: transaction.instructions, // Use the instructions from the program RPC
    }).compileToV0Message();

// Convert the message into a VersionedTransaction
    const versionedTransaction = new VersionedTransaction(messageV0);
  return versionedTransaction;
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


async function airdrop(connection: Connection, publicKey: PublicKey, amount: number) {
  const signature = await connection.requestAirdrop(
    publicKey,
    amount * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(signature);
}
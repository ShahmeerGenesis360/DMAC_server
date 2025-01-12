import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

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
  // const adminPrivateKey = new Buffer(process.env.NEXT_ADMIN_PK as string, 'base64').toString('ascii');
  const adminPrivateKey = process.env.NEXT_PUBLIC_ADMIN_PK as string;
  return anchor.web3.Keypair.fromSecretKey(bs58.decode(adminPrivateKey));
}

function getProgramId() {
  return new anchor.web3.PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID as string
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

export async function swapToTknStart(program: Program, mintKeypair: Keypair) {
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

  return txHash;
}

export async function swapToTkn(
  program: Program,
  provider: anchor.Provider,
  mintKeypair: Keypair,
  tokenPublicKey: PublicKey,
  amountInSol: number
) {
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
    await airdrop(provider.connection, associatedTokenAddress.address, 1);
    const syncNativeIx = createSyncNativeInstruction(associatedTokenAddress.address);
    const { blockhash } = await provider.connection.getLatestBlockhash("confirmed");
    // Create a transaction to transfer SOL and sync the native account
    const transaction = new Transaction().add(syncNativeIx);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = adminPublicKey;
    // Sign and send the transaction
    const signature = await sendAndConfirmTransaction(provider.connection, transaction, [
      adminKeypair,
    ]);

  const txHash = await swapToToken(
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

  return txHash;
}

export async function swapToTknEnd(program: Program, mintKeypair: Keypair) {
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

  let txHash = await program.rpc.swapToTknEnd({
    accounts: accounts,
    signers: [adminKeypair],
  });

  return txHash;
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

  const txHash = await swapToSolana(
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

  return txHash;
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
  userPublicKey: PublicKey) {
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

  let txHash = await program.rpc.swapToSolEnd({
    accounts: accounts,
    signers: [adminKeypair],
  });

  return txHash;
}

// export async function uninitialize(
//   program: Program) {

//   let txHash = await program.rpc.uninitialize(
//     {accounts: {
//       admin: adminPublicKey,
//       agentsAiCelebPda: agentsAiCelebStatePda,
//       systemProgram: SYSTEM_PROGRAM_ID
//     },
//     signers: [adminKeypair],
//   });

//   return txHash;
// }

// export async function createToken(
//   program: Program,
//   name: string,
//   symbol: string,
//   uri: string,
//   creatorPublicKey: PublicKey,
//   creatorKeypair?: Keypair) {

//   const mintPublicKey = getMint(creatorPublicKey, symbol);
//   const accounts = {
//     creator: creatorPublicKey,
//     mint: mintPublicKey,
//     metadata: getMetadata(mintPublicKey),
//     systemProgram: SYSTEM_PROGRAM_ID,
//     tokenProgram: TOKEN_PROGRAM_ID,
//     tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
//     rent: SYSVAR_RENT_PUBKEY,
//     tokenInfo: getTokenInfoPda(mintPublicKey),
//   }
//   // console.log("accounts", accounts);

//   let txHash = await program.rpc.createToken(
//     {
//       name: name,
//       symbol: symbol,
//       uri: uri
//     },
//     {
//       accounts: accounts,
//       signers: creatorKeypair ? [creatorKeypair] : [],
//   });

//   return [txHash, mintPublicKey.toString()];
// }

// export async function buyToken(
//   program: Program,
//   creatorAddress: string,
//   symbol: string,
//   amount_in_sol: number,
//   userPublicKey: PublicKey,
//   userKeypair?: Keypair) {

//   const creatorPublicKey = new PublicKey(creatorAddress);
//   const mintPublicKey = getMint(creatorPublicKey, symbol);

//   const userTokenAccount = await createAndGetTokenAccount(
//       program,
//       userPublicKey,
//       mintPublicKey,
//       TOKEN_PROGRAM_ID
//   );

//   const accounts = {
//     user: userPublicKey,
//     creator: creatorPublicKey,
//     mint: mintPublicKey,
//     userTokenAccount: userTokenAccount,
//     systemProgram: SYSTEM_PROGRAM_ID,
//     tokenProgram: TOKEN_PROGRAM_ID,
//     associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
//     tokenInfo: getTokenInfoPda(mintPublicKey),
//   }
//   // console.log("accounts", accounts);

//   let txHash = await program.rpc.buyToken(
//     symbol,
//     new anchor.BN(amount_in_sol * LAMPORTS_PER_SOL),
//     {
//       accounts: accounts,
//       signers: userKeypair ? [userKeypair] : [],
//     }
//   );

//   return txHash;
// }

// export async function sellToken(
//   program: Program,
//   creatorAddress: string,
//   symbol: string,
//   amount_in_token: number,
//   userPublicKey: PublicKey,
//   userKeypair?: Keypair) {

//   const creatorPublicKey = new PublicKey(creatorAddress);
//   const mintPublicKey = getMint(creatorPublicKey, symbol);
//   const userTokenAccount = await createAndGetTokenAccount(
//       program,
//       userPublicKey,
//       mintPublicKey,
//       TOKEN_PROGRAM_ID
//   );

//   const accounts = {
//     user: userPublicKey,
//     creator: creatorPublicKey,
//     mint: mintPublicKey,
//     userTokenAccount: userTokenAccount,
//     systemProgram: SYSTEM_PROGRAM_ID,
//     tokenProgram: TOKEN_PROGRAM_ID,
//     tokenInfo: getTokenInfoPda(mintPublicKey),
//   }
//   // console.log("accounts", accounts);

//   let txHash = await program.rpc.sellToken(
//     symbol,
//     new anchor.BN(amount_in_token * LAMPORTS_PER_SOL),
//     {
//       accounts: accounts,
//       signers: userKeypair ? [userKeypair] : [],
//   });

//   return txHash;
// }

// export async function createWsol(
//   program: Program,
//   creatorAddress: string,
//   symbol: string) {

//   const creatorPublicKey = new PublicKey(creatorAddress);
//   const mintPublicKey = getMint(creatorPublicKey, symbol);
//   const creator = adminKeypair;
//   const token0 = SOL_MINT;
//   const token0Program = TOKEN_PROGRAM_ID;
//   const tokenInfoPda = getTokenInfoPda(mintPublicKey)

//   const wsolTokenAccount = getAssociatedTokenAddressSync(
//     token0,
//     creator.publicKey,
//     false,
//     token0Program
//   );

//   const accounts = {
//     admin: adminPublicKey,
//     mint: mintPublicKey,
//     wsolMint: SOL_MINT,
//     wsolTokenAccount: wsolTokenAccount,
//     tokenProgram: TOKEN_PROGRAM_ID,
//     systemProgram: SYSTEM_PROGRAM_ID,
//     associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//     tokenInfo: tokenInfoPda,
//     agentsAiCelebPda: agentsAiCelebStatePda,
//   }
//   // console.log("accounts: ", accounts);

//   const txHash = await program.rpc.createWsol(
//     symbol,
//     {
//       accounts: accounts,
//       signers: [adminKeypair]
//     }
//   );

//   return txHash;
// }

// export async function setLive(
//   program: Program,
//   creatorAddress: string,
//   symbol: string) {

//   const creatorPublicKey = new PublicKey(creatorAddress);
//   const mintPublicKey = getMint(creatorPublicKey, symbol);
//   const creator = adminKeypair;
//   const token0 = SOL_MINT;
//   const token1 = mintPublicKey;
//   const token0Program = TOKEN_PROGRAM_ID;
//   const token1Program = TOKEN_PROGRAM_ID;
//   const createPoolFee = createPoolFeeReceive;
//   const tokenInfoPda = getTokenInfoPda(mintPublicKey);

//   const creatorToken0 = getAssociatedTokenAddressSync(
//     token0,
//     // tokenInfoPda,
//     // true,
//     adminPublicKey,
//     false,
//     token0Program
//   );
//   const creatorToken1 = getAssociatedTokenAddressSync(
//     token1,
//     // tokenInfoPda,
//     // true,
//     adminPublicKey,
//     false,
//     token1Program
//   );

//   const [auth] = await getAuthAddress(cpSwapProgram);
//   const [poolAddress] = await getPoolAddress(
//     configAddress,
//     token0,
//     token1,
//     cpSwapProgram
//   );
//   const [lpMintAddress] = await getPoolLpMintAddress(
//     poolAddress,
//     cpSwapProgram
//   );
//   const [vault0] = await getPoolVaultAddress(
//     poolAddress,
//     token0,
//     cpSwapProgram
//   );
//   const [vault1] = await getPoolVaultAddress(
//     poolAddress,
//     token1,
//     cpSwapProgram
//   );
//   const [creatorLpTokenAddress] = await PublicKey.findProgramAddress(
//     [
//       creator.publicKey.toBuffer(),
//       TOKEN_PROGRAM_ID.toBuffer(),
//       lpMintAddress.toBuffer(),
//     ],
//     ASSOCIATED_PROGRAM_ID
//   );

//   const [observationAddress] = await getOrcleAccountAddress(
//     poolAddress,
//     cpSwapProgram
//   );

//   const accounts = {
//     creator: creatorPublicKey,
//     cpSwapProgram: cpSwapProgram,
//     admin: creator.publicKey,
//     ammConfig: configAddress,
//     authority: auth,
//     poolState: poolAddress,
//     token0Mint: token0,
//     token1Mint: token1,
//     lpMint: lpMintAddress,
//     creatorToken0,
//     creatorToken1,
//     creatorLpToken: creatorLpTokenAddress,
//     token0Vault: vault0,
//     token1Vault: vault1,
//     createPoolFee,
//     observationState: observationAddress,
//     tokenProgram: TOKEN_PROGRAM_ID,
//     token0Program: token0Program,
//     token1Program: token1Program,
//     associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//     systemProgram: SYSTEM_PROGRAM_ID,
//     rent: SYSVAR_RENT_PUBKEY,
//     agentsAiCelebPda: agentsAiCelebStatePda,
//     tokenInfo: getTokenInfoPda(mintPublicKey)
//   }
//   // console.log("accounts: ", accounts);

//   const txHash = await program.methods
//   .setLive(symbol)
//   .accounts(accounts)
//   .preInstructions([
//     ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
//   ])
//   .rpc();

//   return txHash;
// }

// export async function displayPda(program: Program, indexConfig: PublicKey) {
//   const pdaData = await program.account.indexConfig.fetch(indexConfig);
//   const admin = pdaData.admin.toString();
//   const total_value = pdaData.total_value.toString();
//   const total_supply = pdaData.total_supply.toString();
//   // const sol_in = pdaData.sol_in.toString();
//   console.log(
//     `(admin:${admin}, total_value:${total_value}, total_supply:${total_supply})`
//   );

  // console.log(
  //   "Admin Balance       : ",
  //   await connection.getBalance(adminPublicKey)
  // );
// }

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